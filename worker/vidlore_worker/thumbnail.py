"""Thumbnail: first scene image, darkened bottom, big title."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from . import settings

YELLOW = (255, 210, 63)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        if lines and draw.textlength(f"{lines[-1]} {word}", font=font) <= max_w:
            lines[-1] = f"{lines[-1]} {word}"
        else:
            lines.append(word)
    return lines or [""]


def make_thumbnail(image: Path, title: str, font_file: Path, out: Path) -> None:
    img = ImageOps.fit(Image.open(image).convert("RGB"), (settings.WIDTH, settings.HEIGHT), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=60))
    shade = Image.new("L", (1, settings.HEIGHT))
    for y in range(settings.HEIGHT):
        f = max(0.0, (y - settings.HEIGHT * 0.45) / (settings.HEIGHT * 0.55))
        shade.putpixel((0, y), int(225 * f ** 1.3))
    black = Image.new("RGB", img.size, (8, 8, 14))
    img = Image.composite(black, img, shade.resize(img.size))

    draw = ImageDraw.Draw(img)
    text = title.upper()
    max_w = settings.WIDTH - 140
    size = 124
    while True:
        font = ImageFont.truetype(str(font_file), size)
        lines = _wrap(draw, text, font, max_w)
        widest = max(draw.textlength(line, font=font) for line in lines)
        if (widest <= max_w and len(lines) <= 4) or size <= 56:
            break
        size -= 6
    line_h = int(size * 1.12)
    y = settings.HEIGHT - 260 - line_h * len(lines)
    draw.rounded_rectangle((70, y - 60, 230, y - 36), radius=12, fill=YELLOW)
    for i, line in enumerate(lines):
        color = YELLOW if i == len(lines) - 1 else (255, 255, 255)
        draw.text((70, y + i * line_h), line, font=font, fill=color, stroke_width=6, stroke_fill=(0, 0, 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=88, optimize=True, progressive=True)
