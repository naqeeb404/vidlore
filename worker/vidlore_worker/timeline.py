"""Mirror of the TypeScript `timeline` schema in packages/core/src/schemas.ts."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class SceneSpec:
    narration: str
    image: str


@dataclass
class Timeline:
    job_id: str
    title: str
    voice: str
    lang: str
    speed: float
    music: str
    scenes: list[SceneSpec]
    video_key: str
    thumbnail_key: str
    work_prefix: str
    callback_url: Optional[str]

    @staticmethod
    def parse(data: dict) -> "Timeline":
        if data.get("version") != 1:
            raise ValueError("Unsupported timeline version")
        scenes = [SceneSpec(s["narration"], s["image"]) for s in data["scenes"]]
        if not scenes:
            raise ValueError("Timeline has no scenes")
        out = data["output"]
        return Timeline(
            job_id=data["jobId"],
            title=data["title"],
            voice=data["voice"],
            lang=data.get("lang", "en-us"),
            speed=float(data.get("speed", 1.0)),
            music=data.get("music", "mystery"),
            scenes=scenes,
            video_key=out["video"],
            thumbnail_key=out["thumbnail"],
            work_prefix=out["workPrefix"],
            callback_url=(data.get("callback") or {}).get("url"),
        )
