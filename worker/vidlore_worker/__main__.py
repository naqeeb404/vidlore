"""Entry point: python -m vidlore_worker --timeline <storage key or file path>

Also used as the Cloud Run job command (TIMELINE_KEY env var instead of the flag).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
import traceback
import urllib.parse
import urllib.request
from dataclasses import asdict
from pathlib import Path
from typing import Callable, TypeVar

from . import captions, music, render, settings, thumbnail, transcribe, voice
from .fonts import find_font
from .storage import get_storage
from .timeline import Timeline
from .webhook import notify

T = TypeVar("T")


def retry_once(name: str, fn: Callable[[], T]) -> T:
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        print(f"[{name}] failed, retrying once: {exc}")
        time.sleep(2)
        return fn()


class Timer:
    def __init__(self) -> None:
        self.last = time.time()

    def lap(self, label: str) -> None:
        now = time.time()
        print(f"[time] {label}: {now - self.last:.1f}s")
        self.last = now


# Only stock-footage CDNs: the timeline comes from our server, but never fetch arbitrary hosts.
CLIP_HOSTS = ("videos.pexels.com", "player.vimeo.com", "cdn.pixabay.com", "pixabay.com")


def fetch_clip(url: str) -> bytes:
    host = urllib.parse.urlparse(url).hostname or ""
    if urllib.parse.urlparse(url).scheme != "https" or not any(host == h or host.endswith("." + h) for h in CLIP_HOSTS):
        raise RuntimeError(f"Refusing to download footage from {host}")
    req = urllib.request.Request(url, headers={"user-agent": "Vidlore/1.0 (+https://vidlore.app)"})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeline", default=os.environ.get("TIMELINE_KEY"))
    parser.add_argument("--keep-work", action="store_true")
    args = parser.parse_args()
    if not args.timeline:
        parser.error("--timeline or TIMELINE_KEY is required")

    storage = get_storage()
    raw = Path(args.timeline).read_bytes() if Path(args.timeline).is_file() else storage.get(args.timeline)
    if raw is None:
        print(f"Timeline not found: {args.timeline}", file=sys.stderr)
        return 2
    tl = Timeline.parse(json.loads(raw))
    report = lambda stage, **extra: notify(tl.callback_url, {"jobId": tl.job_id, "stage": stage, **extra})  # noqa: E731

    work = Path(tempfile.mkdtemp(prefix=f"vidlore-{tl.job_id[:8]}-"))
    started = time.time()
    timer = Timer()
    try:
        # 1. Inputs (real clips are downloaded straight from the footage CDN)
        media: list[tuple[str, Path]] = []
        for i, sc in enumerate(tl.scenes):
            kind, key = ("video", sc.video) if (sc.video or sc.video_url) else ("image", sc.image)
            data = retry_once("footage", lambda: fetch_clip(sc.video_url)) if sc.video_url else storage.get(key)
            if data is None:
                raise RuntimeError(f"Missing scene {kind} {key}")
            p = work / (f"clip_{i:02d}.mp4" if kind == "video" else f"image_{i:02d}.jpg")
            p.write_bytes(data)
            media.append((kind, p))

        # 2. Voice + word timings (cached in storage so retries skip them)
        report("voice")
        voice_key = f"{tl.work_prefix}/voice.wav"
        meta_key = f"{tl.work_prefix}/words.json"
        voice_wav = work / "voice.wav"
        cached_voice, cached_meta = storage.get(voice_key), storage.get(meta_key)
        narration = [s.narration for s in tl.scenes]
        if cached_voice and cached_meta and json.loads(cached_meta).get("narration") == narration:
            voice_wav.write_bytes(cached_voice)
            meta = json.loads(cached_meta)
            starts = meta["starts"]
            words = [transcribe.Word(**w) for w in meta["words"]]
            print("[voice] using cached voice and word timings")
        else:
            starts = retry_once("voice", lambda: voice.generate_voice(narration, tl.voice, tl.lang, tl.speed, voice_wav))
            print(f"[voice] {render.probe_duration(voice_wav):.1f}s of narration")
            timer.lap("voice")
            heard = retry_once("transcribe", lambda: transcribe.transcribe(voice_wav))
            words = transcribe.align(narration, heard, starts, render.probe_duration(voice_wav))
            print(f"[transcribe] {len(heard)} words heard, {len(words)} script words timed")
            timer.lap("transcribe")
            storage.put(voice_key, voice_wav.read_bytes(), "audio/wav")
            storage.put(meta_key, json.dumps({"narration": narration, "starts": starts,
                                               "words": [asdict(w) for w in words]}).encode(), "application/json")

        # 3. Captions + music
        family, font_file = find_font()
        subs = work / "subs.ass"
        captions.build_ass(words, family, subs)
        duration = render.probe_duration(voice_wav) + 2
        track = music.pick_track(tl.music, duration, work)
        timer.lap("captions + music")

        # 4. Render
        report("rendering")
        out = work / "video.mp4"
        total = retry_once("render", lambda: render.render_video(
            media=media, effects=[sc.effect for sc in tl.scenes], atmosphere=tl.atmosphere, grade=tl.grade, scene_starts=starts, voice=voice_wav, music=track, subs=subs,
            font_file=font_file, work=work, out=out))
        timer.lap("render")
        thumb = work / "thumbnail.jpg"
        cover = media[0][1]
        if media[0][0] == "video":  # grab a frame from the opening shot
            cover = work / "cover.jpg"
            render.run([settings.FFMPEG, "-y", "-hide_banner", "-ss", "1", "-i", str(work / "scene_00.mp4"),
                        "-frames:v", "1", "-q:v", "2", str(cover)])
        thumbnail.make_thumbnail(cover, tl.title, font_file, thumb)

        # 5. Upload
        storage.put(tl.video_key, out.read_bytes(), "video/mp4")
        storage.put(tl.thumbnail_key, thumb.read_bytes(), "image/jpeg")
        elapsed = time.time() - started
        print(f"[done] {total:.1f}s video rendered in {elapsed:.0f}s -> {tl.video_key}")
        report("done", durationSec=round(total, 2), videoKey=tl.video_key, thumbnailKey=tl.thumbnail_key)
        return 0
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        report("failed", error=str(exc)[:500])
        return 1
    finally:
        if args.keep_work:
            print(f"[work] kept {work}")
        else:
            shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
