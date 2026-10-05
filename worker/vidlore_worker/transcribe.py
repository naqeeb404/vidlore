"""transcribe: faster-whisper word timestamps, snapped onto the script's own words."""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from pathlib import Path

from . import settings


@dataclass
class Word:
    text: str
    start: float
    end: float
    scene: int


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


def transcribe(wav: Path) -> list[tuple[str, float, float]]:
    from faster_whisper import WhisperModel

    model = WhisperModel(settings.WHISPER_MODEL, device="cpu", compute_type="int8",
                         download_root=str(settings.MODELS_DIR / "whisper"))
    # Decode ourselves (16 kHz mono float32) instead of relying on PyAV inside faster-whisper.
    import numpy as np
    import soundfile as sf

    audio, sr = sf.read(str(wav), dtype="float32", always_2d=True)
    audio = audio.mean(axis=1)
    if sr != 16000:
        n = int(len(audio) * 16000 / sr)
        audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)
    segments, _ = model.transcribe(audio, language="en", word_timestamps=True, vad_filter=False,
                                   beam_size=5, condition_on_previous_text=False)
    words: list[tuple[str, float, float]] = []
    for seg in segments:
        for w in seg.words or []:
            words.append((w.word.strip(), float(w.start), float(w.end)))
    return words


def align(script_scenes: list[str], heard: list[tuple[str, float, float]], scene_starts: list[float],
          total: float) -> list[Word]:
    """Give every script word a time. Matched words take Whisper's timing; gaps are interpolated."""
    script_words: list[tuple[str, int]] = [
        (w, i) for i, text in enumerate(script_scenes) for w in text.split() if _norm(w)
    ]
    a = [_norm(w) for w, _ in script_words]
    b = [_norm(w) for w, _, _ in heard]
    times: list[tuple[float, float] | None] = [None] * len(a)
    for block in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            _, s, e = heard[block.b + k]
            times[block.a + k] = (s, e)

    # Fill unmatched runs between known neighbours, never crossing into another scene.
    n = len(times)
    i = 0
    while i < n:
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < n and times[j] is None:
            j += 1
        scene = script_words[i][1]
        left = times[i - 1][1] if i > 0 and times[i - 1] else scene_starts[scene]
        right = times[j][0] if j < n and times[j] else total
        left = max(left, scene_starts[scene])
        if right <= left:
            right = left + 0.25 * (j - i)
        step = (right - left) / (j - i)
        for k in range(i, j):
            times[k] = (left + step * (k - i), left + step * (k - i + 1))
        i = j

    out: list[Word] = []
    for (text, scene), t in zip(script_words, times):
        assert t is not None
        start, end = t
        if out and start < out[-1].end:
            start = out[-1].end
        out.append(Word(text=text, start=start, end=max(end, start + 0.05), scene=scene))
    return out
