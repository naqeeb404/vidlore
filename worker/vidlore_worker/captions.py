"""Word-by-word ASS captions: short chunks, the spoken word highlighted in Vidlore yellow."""
from __future__ import annotations

from pathlib import Path

from .transcribe import Word

YELLOW = "&H003FD2FF&"  # #FFD23F in ASS BGR
WHITE = "&H00FFFFFF&"
MAX_WORDS = 3
MAX_CHARS = 13


def _ts(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _escape(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


def _chunks(words: list[Word]) -> list[list[Word]]:
    chunks: list[list[Word]] = []
    cur: list[Word] = []
    for w in words:
        too_long = len(" ".join(x.text for x in cur + [w])) > MAX_CHARS
        if cur and (len(cur) >= MAX_WORDS or too_long or w.scene != cur[-1].scene
                    or w.start - cur[-1].end > 0.45):
            chunks.append(cur)
            cur = []
        cur.append(w)
        if w.text[-1:] in ".!?;:,":
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def build_ass(words: list[Word], font: str, out: Path) -> None:
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{font},116,{WHITE},{WHITE},&H00000000&,&H96000000&,-1,0,0,0,100,100,1,0,1,9,5,5,70,70,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines: list[str] = []
    chunks = _chunks(words)
    for ci, chunk in enumerate(chunks):
        next_start = chunks[ci + 1][0].start if ci + 1 < len(chunks) else chunk[-1].end + 0.6
        chunk_end = min(next_start, chunk[-1].end + 0.35)
        for wi, active in enumerate(chunk):
            start = active.start
            end = chunk[wi + 1].start if wi + 1 < len(chunk) else chunk_end
            if end <= start:
                continue
            parts = []
            for k, w in enumerate(chunk):
                text = _escape(w.text.upper())
                if k == wi:
                    parts.append(r"{\c" + YELLOW + r"\fscx112\fscy112}" + text + r"{\c" + WHITE + r"\fscx100\fscy100}")
                else:
                    parts.append(text)
            # Pop in when a new chunk appears.
            anim = r"{\pos(540,1240)\fad(40,0)\t(0,90,\fscx104\fscy104)\t(90,160,\fscx100\fscy100)}" if wi == 0 else r"{\pos(540,1240)}"
            lines.append(f"Dialogue: 0,{_ts(start)},{_ts(end)},Caption,,0,0,0,,{anim}{' '.join(parts)}")
    out.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
