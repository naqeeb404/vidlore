"""Mirror of the TypeScript `timeline` schema in packages/core/src/schemas.ts."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SceneSpec:
    narration: str
    image: Optional[str] = None
    video: Optional[str] = None
    video_url: Optional[str] = None
    effect: str = "none"


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
    atmosphere: list[str] = field(default_factory=list)
    grade: str = "cinematic"

    @staticmethod
    def parse(data: dict) -> "Timeline":
        if data.get("version") != 1:
            raise ValueError("Unsupported timeline version")
        scenes = [
            SceneSpec(s["narration"], s.get("image"), s.get("video"), s.get("videoUrl"), s.get("effect") or "none")
            for s in data["scenes"]
        ]
        if not scenes or any(not (s.image or s.video or s.video_url) for s in scenes):
            raise ValueError("Every scene needs an image or a video")
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
            atmosphere=list(data.get("atmosphere") or []),
            grade=data.get("grade") or "cinematic",
        )
