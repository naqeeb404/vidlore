"""Downloads open-source model files on first use (baked into the Docker image for Cloud Run)."""
from __future__ import annotations

import urllib.request
from pathlib import Path

from . import settings


def ensure(url: str, name: str | None = None) -> Path:
    dest = settings.MODELS_DIR / (name or Path(url).name)
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"[models] downloading {url}")
    urllib.request.urlretrieve(url, tmp)
    tmp.replace(dest)
    return dest
