"""generateVoice: Kokoro TTS (ONNX). One clip per scene, joined with short pauses."""
from __future__ import annotations

import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

from . import settings

_kokoro = None


def _download(url: str, dest: Path) -> None:
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"[voice] downloading {url}")
    urllib.request.urlretrieve(url, tmp)
    tmp.replace(dest)


def ensure_models() -> tuple[Path, Path]:
    model = settings.MODELS_DIR / Path(settings.KOKORO_MODEL_URL).name
    voices = settings.MODELS_DIR / Path(settings.KOKORO_VOICES_URL).name
    _download(settings.KOKORO_MODEL_URL, model)
    _download(settings.KOKORO_VOICES_URL, voices)
    return model, voices


def _engine():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro

        model, voices = ensure_models()
        _kokoro = Kokoro(str(model), str(voices))
    return _kokoro


def generate_voice(texts: list[str], voice: str, lang: str, speed: float, out_wav: Path) -> list[float]:
    """Writes the full voiceover and returns the start time (seconds) of each scene."""
    kokoro = _engine()
    pause = np.zeros(int(settings.SCENE_PAUSE_SEC * settings.SAMPLE_RATE), dtype=np.float32)
    lead = np.zeros(int(0.15 * settings.SAMPLE_RATE), dtype=np.float32)
    chunks: list[np.ndarray] = [lead]
    starts: list[float] = []
    cursor = len(lead)
    for i, text in enumerate(texts):
        samples, sr = kokoro.create(text, voice=voice, speed=speed, lang=lang)
        assert sr == settings.SAMPLE_RATE, f"unexpected sample rate {sr}"
        samples = _trim_silence(samples.astype(np.float32))
        # A scene visually starts slightly before its first word.
        starts.append(0.0 if i == 0 else max(0.0, cursor / sr - settings.SCENE_PAUSE_SEC / 2))
        chunks.append(samples)
        cursor += len(samples)
        if i < len(texts) - 1:
            chunks.append(pause)
            cursor += len(pause)
    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio / peak * 0.89
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out_wav, audio, settings.SAMPLE_RATE, subtype="PCM_16")
    return starts


def _trim_silence(samples: np.ndarray, threshold: float = 0.01) -> np.ndarray:
    idx = np.where(np.abs(samples) > threshold)[0]
    if len(idx) == 0:
        return samples
    pad = int(0.04 * settings.SAMPLE_RATE)
    return samples[max(0, idx[0] - pad) : min(len(samples), idx[-1] + pad)]
