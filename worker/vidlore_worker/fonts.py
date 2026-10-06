"""Find a heavy display font for captions and thumbnails."""
from __future__ import annotations

from pathlib import Path

from . import settings

# (family name for libass, file name) in order of preference.
CANDIDATES = [
    ("Montserrat ExtraBold", "Montserrat-ExtraBold.ttf"),
    ("Montserrat Black", "Montserrat-Black.ttf"),
    ("Anton", "Anton-Regular.ttf"),
    ("Arial Black", "ariblk.ttf"),
    ("Arial Black", "Arial Black.ttf"),  # macOS
    ("DejaVu Sans", "DejaVuSans-Bold.ttf"),
]
SYSTEM_DIRS = [
    Path("C:/Windows/Fonts"),
    Path("/System/Library/Fonts/Supplemental"),  # macOS
    Path("/Library/Fonts"),
    Path("/usr/share/fonts/truetype/montserrat"),
    Path("/usr/share/fonts/truetype/dejavu"),
    Path("/usr/share/fonts"),
]


def find_font() -> tuple[str, Path]:
    """Returns (family, file path)."""
    for family, filename in CANDIDATES:
        for d in [settings.FONTS_DIR, *SYSTEM_DIRS]:
            p = d / filename
            if p.exists():
                return family, p
            if d.exists():
                hits = list(d.rglob(filename))
                if hits:
                    return family, hits[0]
    raise RuntimeError("No caption font found. Put Montserrat-ExtraBold.ttf in assets/fonts/.")
