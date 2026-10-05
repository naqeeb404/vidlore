"""Royalty-free background music synthesized on the fly (no licensing questions).

Drop your own CC0/licensed tracks into assets/music/<mood>*.mp3|wav to use them instead.
"""
from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import soundfile as sf

from . import settings

SR = 44100

# MIDI chord progressions per mood (root octave ~ C3).
MOODS: dict[str, dict] = {
    "dark": {"chords": [[45, 52, 57, 60], [41, 48, 53, 57], [38, 45, 50, 53], [40, 47, 52, 56]],
             "bar": 6.0, "cutoff": 900, "arp": False, "pulse": True},
    "mystery": {"chords": [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]],
                "bar": 4.0, "cutoff": 1400, "arp": True, "pulse": False},
    "uplift": {"chords": [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]],
               "bar": 3.2, "cutoff": 2200, "arp": True, "pulse": True},
    "warm": {"chords": [[41, 48, 53, 57, 64], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [48, 55, 60, 64, 67]],
             "bar": 3.6, "cutoff": 1800, "arp": True, "pulse": False},
}


def _hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _pad_note(freq: float, n: int, rng: random.Random) -> np.ndarray:
    t = np.arange(n) / SR
    out = np.zeros(n)
    for detune in (-0.08, 0.0, 0.07):
        f = freq * 2 ** (detune / 12)
        phase = rng.random() * 2 * np.pi
        for h in range(1, 7):
            out += np.sin(2 * np.pi * f * h * t + phase * h) / (h ** 1.4)
    return out / 6


def _lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    # Frequency-domain brickwall with soft knee; fine for a pad bed.
    spec = np.fft.rfft(x, axis=0)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    gain = 1 / (1 + (freqs / cutoff) ** 4)
    return np.fft.irfft(spec * gain[:, None] if x.ndim == 2 else spec * gain, n=len(x), axis=0)


def _reverb(x: np.ndarray, seconds: float = 2.8, mix: float = 0.35, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n_ir = int(seconds * SR)
    decay = np.exp(-np.linspace(0, 6, n_ir))
    out = np.empty_like(x)
    for c in range(x.shape[1]):
        ir = rng.standard_normal(n_ir) * decay
        ir /= np.sqrt(np.sum(ir ** 2))
        size = len(x) + n_ir
        nfft = 1 << (size - 1).bit_length()
        wet = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
        out[:, c] = (1 - mix) * x[:, c] + mix * wet
    return out


def synthesize(mood: str, duration: float, out: Path, seed: int = 1) -> Path:
    cfg = MOODS.get(mood, MOODS["mystery"])
    rng = random.Random(seed)
    n = int((duration + 1.0) * SR)
    mix = np.zeros((n, 2))
    bar = int(cfg["bar"] * SR)
    xfade = int(1.2 * SR)
    window_rise = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, xfade))

    pos, idx = 0, 0
    while pos < n:
        chord = cfg["chords"][idx % len(cfg["chords"])]
        length = min(bar + xfade, n - pos)
        env = np.ones(length)
        rise = min(xfade, length)
        env[:rise] = window_rise[:rise]
        env[-rise:] *= window_rise[:rise][::-1]
        for k, note in enumerate(chord):
            tone = _pad_note(_hz(note), length, rng) * env
            pan = 0.5 + (k - len(chord) / 2) * 0.12
            mix[pos : pos + length, 0] += tone * (1 - pan)
            mix[pos : pos + length, 1] += tone * pan
        # Sub bass on the root.
        t = np.arange(length) / SR
        bass = np.sin(2 * np.pi * _hz(chord[0] - 12) * t) * env * 0.9
        mix[pos : pos + length] += bass[:, None]
        if cfg["arp"]:
            step = int(SR * cfg["bar"] / 8)
            notes = chord[1:] + [chord[1] + 12]
            for s in range(8):
                start = pos + s * step
                if start >= n:
                    break
                ln = min(int(step * 1.8), n - start)
                tt = np.arange(ln) / SR
                f = _hz(notes[s % len(notes)] + 12)
                pluck = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 5) * 0.28
                side = 0 if s % 2 else 1
                mix[start : start + ln, side] += pluck
                mix[start : start + ln, 1 - side] += pluck * 0.6
        if cfg["pulse"]:
            beat = int(SR * cfg["bar"] / 4)
            for s in range(4):
                start = pos + s * beat
                if start >= n:
                    break
                ln = min(int(0.35 * SR), n - start)
                tt = np.arange(ln) / SR
                kick = np.sin(2 * np.pi * (55 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9) * 0.8
                mix[start : start + ln] += kick[:, None]
        pos += bar
        idx += 1

    mix = _lowpass(mix, cfg["cutoff"])
    mix = _reverb(mix)
    # Gentle fades in/out.
    fade = int(1.5 * SR)
    mix[:fade] *= np.linspace(0, 1, fade)[:, None]
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix /= np.max(np.abs(mix)) or 1.0
    mix *= 0.9
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.astype(np.float32), SR, subtype="PCM_16")
    return out


def pick_track(mood: str, duration: float, work: Path) -> Path:
    library = settings.REPO_DIR / "assets" / "music"
    if library.exists():
        tracks = sorted(p for p in library.iterdir() if p.stem.startswith(mood) and p.suffix in {".mp3", ".wav", ".ogg"})
        if tracks:
            return random.choice(tracks)
    return synthesize(mood, duration, work / f"music-{mood}.wav")
