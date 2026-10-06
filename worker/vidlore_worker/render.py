"""render: FFmpeg. Real footage or 3D-camera AI shots per scene, crossfades, karaoke captions, ducked music."""
from __future__ import annotations

import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import motion, settings

MOTIONS = {
    "zoom_in": ("1+0.16*on/{N}", "(iw-iw/zoom)/2", "(ih-ih/zoom)/2"),
    "zoom_out": ("1.16-0.16*on/{N}", "(iw-iw/zoom)/2", "(ih-ih/zoom)/2"),
    "pan_down": ("1.14", "(iw-iw/zoom)/2", "(ih-ih/zoom)*on/{N}"),
    "pan_up": ("1.14", "(iw-iw/zoom)/2", "(ih-ih/zoom)*(1-on/{N})"),
    "pan_right": ("1.14", "(iw-iw/zoom)*on/{N}", "(ih-ih/zoom)/2"),
}
SEQUENCE = ["pan_down", "zoom_out", "pan_right", "zoom_in", "pan_up"]


def run(cmd: list[str], cwd: Path | None = None) -> None:
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({proc.returncode}):\n{proc.stderr[-2500:]}")


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        [settings.FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(out.stdout)["format"]["duration"])


def render_scene(image: Path, seconds: float, motion: str, out: Path) -> None:
    frames = max(1, round(seconds * settings.FPS))
    z, x, y = (e.format(N=frames) for e in MOTIONS[motion])
    w2, h2 = settings.WIDTH * 2, settings.HEIGHT * 2
    vf = (
        f"scale={w2}:{h2}:force_original_aspect_ratio=increase:flags=lanczos,crop={w2}:{h2},setsar=1,"
        f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={settings.WIDTH}x{settings.HEIGHT}:fps={settings.FPS},"
        "eq=contrast=1.04:saturation=1.08,format=yuv420p"
    )
    run([settings.FFMPEG, "-y", "-hide_banner", "-i", str(image), "-vf", vf, "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-an", str(out)])


def render_stock(clip: Path, seconds: float, out: Path) -> None:
    """Fit a real footage clip to the scene: trim from near its start, or slow it down slightly if short."""
    frames = max(1, round(seconds * settings.FPS))
    w, h = settings.WIDTH, settings.HEIGHT
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos,crop={w}:{h},setsar=1,"
          f"fps={settings.FPS},eq=contrast=1.04:saturation=1.06,format=yuv420p")
    dur = probe_duration(clip)
    if dur >= seconds + 0.2:
        src = ["-ss", f"{min((dur - seconds) / 3, 1.5):.2f}", "-i", str(clip)]
    elif seconds / dur <= 1.8:
        src = ["-i", str(clip)]
        vf = f"setpts={seconds / dur:.4f}*PTS," + vf  # gentle slow motion reads as cinematic
    else:
        src = ["-stream_loop", "-1", "-i", str(clip)]
    run([settings.FFMPEG, "-y", "-hide_banner", *src, "-vf", vf, "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "14", "-an", str(out)])


def render_video(*, media: list[tuple[str, Path]], effects: list[str], atmosphere: list[str], scene_starts: list[float], voice: Path, music: Path, subs: Path,
                 font_file: Path, work: Path, out: Path) -> float:
    total = probe_duration(voice) + settings.TAIL_SEC
    T = settings.TRANSITION_SEC
    bounds = scene_starts[1:] + [total]
    engine = os.environ.get("CAMERA_ENGINE", "parallax")
    base_atmo = set(atmosphere)

    def make(i: int) -> Path:
        kind, src = media[i]
        dur = bounds[i] - scene_starts[i] + (T if i > 0 else 0)
        out_clip = work / f"scene_{i:02d}.mp4"
        if kind == "video":
            render_stock(src, dur, out_clip)
            what = "real footage"
        elif engine == "parallax":
            move = "push_in" if i == 0 else motion.SEQUENCE[(i - 1) % len(motion.SEQUENCE)]
            atmo = base_atmo | ({effects[i]} if effects[i] != "none" else set())
            motion.render_parallax(src, dur, move, atmo, out_clip, seed=i)
            what = f"3D camera {move} {sorted(atmo)}"
        else:
            move = "zoom_in" if i == 0 else SEQUENCE[(i - 1) % len(SEQUENCE)]
            render_scene(src, dur, move, out_clip)
            what = f"ken burns {move}"
        print(f"[render] scene {i + 1}/{len(media)}: {what}, {dur:.1f}s")
        return out_clip

    # Scenes are independent; render a few side by side.
    with ThreadPoolExecutor(max_workers=max(1, min(4, (os.cpu_count() or 2) // 2 + 1))) as pool:
        clips = list(pool.map(make, range(len(media))))

    fonts = work / "fonts"
    fonts.mkdir(exist_ok=True)
    (fonts / font_file.name).write_bytes(font_file.read_bytes())

    inputs: list[str] = []
    for c in clips:
        inputs += ["-i", c.name]
    inputs += ["-i", str(voice.resolve()), "-stream_loop", "-1", "-i", str(music.resolve())]

    graph: list[str] = []
    last = "0:v"
    for i in range(1, len(clips)):
        label = f"x{i}"
        graph.append(f"[{last}][{i}:v]xfade=transition=fade:duration={T}:offset={scene_starts[i] - T:.3f}[{label}]")
        last = label
    graph.append(f"[{last}]ass={subs.name}:fontsdir=fonts,format=yuv420p[v]")
    k = len(clips)
    graph.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][sc]")
    graph.append(f"[{k + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.20[mu]")
    graph.append("[mu][sc]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=450[duck]")
    graph.append(
        f"[vo][duck]amix=inputs=2:duration=first:normalize=0,apad=pad_dur={settings.TAIL_SEC},"
        "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
    )

    run([settings.FFMPEG, "-y", "-hide_banner", *inputs, "-filter_complex", ";".join(graph),
         "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
         "-c:v", "libx264", "-profile:v", "high", "-preset", "faster", "-crf", "21", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
         "-r", str(settings.FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(out.resolve())], cwd=work)
    return total
