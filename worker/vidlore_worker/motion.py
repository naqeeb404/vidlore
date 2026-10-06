"""2.5D camera engine: turns a still into a moving shot.

A depth map drives the warp so near objects move more than far ones (parallax), like a real camera
pushing in, orbiting or craning. Procedural atmosphere (fog, dust, embers, rain, snow, grain,
flicker) adds motion inside the frame. Frames are streamed straight into FFmpeg.

Performance: per-frame work is a few OpenCV calls. Warp maps and effect layers are computed at
half resolution and upscaled, which is invisible because both are smooth.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import cv2
import numpy as np

from . import settings
from .depth import estimate_depth

W, H = settings.WIDTH, settings.HEIGHT
HW, HH = W // 2, H // 2

# zoom: push amount over the shot; px/py: camera travel (fraction of frame); para: depth parallax.
MOVES = {
    "push_in": dict(zoom=0.11, px=0.0, py=-0.012, para=0.0),
    "pull_out": dict(zoom=-0.10, px=0.0, py=0.012, para=0.0),
    "orbit_right": dict(zoom=0.03, px=0.03, py=0.0, para=0.07),
    "orbit_left": dict(zoom=0.03, px=-0.03, py=0.0, para=0.07),
    "crane_up": dict(zoom=0.04, px=0.0, py=-0.025, para=0.06),
    "crane_down": dict(zoom=0.04, px=0.0, py=0.025, para=0.06),
}
SEQUENCE = ["orbit_right", "crane_up", "push_in", "orbit_left", "pull_out", "crane_down"]
BASE_ZOOM = 1.09  # headroom so warped edges never show


def ease(t: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * t)


def cover(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    s = max(W / w, H / h)
    img = cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_LANCZOS4)
    y, x = (img.shape[0] - H) // 2, (img.shape[1] - W) // 2
    img = img[y : y + H, x : x + W]
    # Light unsharp mask: upscaled AI images are soft.
    blur = cv2.GaussianBlur(img, (0, 0), 2.0)
    return cv2.addWeighted(img, 1.35, blur, -0.35, 0)


class Camera:
    """Precomputes warp terms so each frame is map = base + e*zoom_term + t*travel_term."""

    def __init__(self, depth: np.ndarray, move: str):
        m = MOVES[move]
        d = cv2.resize(depth, (HW, HH), interpolation=cv2.INTER_AREA)
        dc = d - float(d.mean())  # near > 0, far < 0
        yy, xx = np.mgrid[0:HH, 0:HW].astype(np.float32)
        xc, yc = (xx - HW / 2) * 2, (yy - HH / 2) * 2  # full-res pixel units
        # Near pixels zoom more than far ones (1/(1+u) ≈ 1-u for the small u used here).
        zf = (0.55 + 0.9 * np.clip(dc + 0.5, 0, 1.5)).astype(np.float32)
        self.base_x = (W / 2 + xc / BASE_ZOOM).astype(np.float32)
        self.base_y = (H / 2 + yc / BASE_ZOOM).astype(np.float32)
        self.zoom_x = (-xc / BASE_ZOOM * m["zoom"] * zf).astype(np.float32)
        self.zoom_y = (-yc / BASE_ZOOM * m["zoom"] * zf).astype(np.float32)
        sx = math.copysign(1, m["px"]) if m["px"] else 0.0
        sy = math.copysign(1, m["py"]) if m["py"] else 0.0
        # Camera travel plus extra shift for near pixels (parallax).
        self.travel_x = (-m["px"] * W - m["para"] * W * dc * sx).astype(np.float32)
        self.travel_y = (-m["py"] * H - m["para"] * H * 0.7 * dc * sy).astype(np.float32)

    def maps(self, e: float, t: float) -> tuple[np.ndarray, np.ndarray]:
        mx = cv2.scaleAdd(self.travel_x, t, cv2.scaleAdd(self.zoom_x, e, self.base_x))
        my = cv2.scaleAdd(self.travel_y, t, cv2.scaleAdd(self.zoom_y, e, self.base_y))
        return (cv2.resize(mx, (W, H), interpolation=cv2.INTER_LINEAR),
                cv2.resize(my, (W, H), interpolation=cv2.INTER_LINEAR))


class Atmosphere:
    """Per-frame overlays. `kinds` is a set like {"fog", "dust", "grain"}."""

    STRENGTH = {"dust": 0.55, "embers": 1.0, "snow": 0.85, "rain": 0.45}

    def __init__(self, kinds: set[str], depth: np.ndarray, seed: int):
        self.kinds = kinds
        self.rng = np.random.default_rng(seed)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        vig = np.clip(1.0 - 0.3 * np.maximum(r - 0.45, 0) ** 1.6, 0, 1)
        self.vignette = cv2.merge([(vig * 255).astype(np.uint8)] * 3)
        if "fog" in kinds:
            small = self.rng.random((HH // 32 + 4, HW // 32 + 8)).astype(np.float32)
            # Wider than the frame so the fog can drift: up to 480 px sideways, 96 px vertically.
            fog = cv2.GaussianBlur(cv2.resize(small, (HW + 480, HH + 128), interpolation=cv2.INTER_CUBIC), (0, 0), 20)
            self.fog = (fog - fog.min()) / (fog.max() - fog.min() + 1e-6)
            self.far = cv2.resize(1.0 - depth, (HW, HH), interpolation=cv2.INTER_AREA).astype(np.float32)
            self.fog_color = np.full((H, W, 3), (150, 150, 160), dtype=np.uint8)
        if "grain" in kinds:
            self.grain = []
            for _ in range(6):
                n = self.rng.normal(0, 6, (HH, HW)).astype(np.float32)
                n = cv2.resize(n, (W, H), interpolation=cv2.INTER_NEAREST)
                pos, neg = np.clip(n, 0, 255).astype(np.uint8), np.clip(-n, 0, 255).astype(np.uint8)
                self.grain.append((cv2.merge([pos] * 3), cv2.merge([neg] * 3)))
        self.particles = [(k, self._spawn(k, n)) for k, n in (("dust", 60), ("embers", 50), ("snow", 120), ("rain", 140)) if k in kinds]

    def _spawn(self, kind: str, n: int) -> np.ndarray:
        r = self.rng
        p = np.zeros((n, 6), dtype=np.float32)  # x, y, vx, vy, size, phase (half-res units)
        p[:, 0], p[:, 1], p[:, 5] = r.uniform(0, HW, n), r.uniform(0, HH, n), r.uniform(0, 2 * np.pi, n)
        if kind == "dust":
            p[:, 2], p[:, 3], p[:, 4] = r.normal(0.12, 0.2, n), r.normal(-0.08, 0.15, n), r.uniform(0.8, 1.8, n)
        elif kind == "embers":
            p[:, 2], p[:, 3], p[:, 4] = r.normal(0.2, 0.3, n), r.uniform(-1.8, -0.6, n), r.uniform(1.0, 2.2, n)
        elif kind == "snow":
            p[:, 2], p[:, 3], p[:, 4] = r.normal(0.15, 0.25, n), r.uniform(0.8, 1.8, n), r.uniform(1.0, 2.4, n)
        else:  # rain
            p[:, 2], p[:, 3], p[:, 4] = r.uniform(-1.5, -0.8, n), r.uniform(14, 20, n), 1
        return p

    def apply(self, frame: np.ndarray, i: int) -> np.ndarray:
        if "fog" in self.kinds:
            ox = int(110 + 100 * math.sin(i / 140) + min(i * 0.4, 260))
            oy = int(64 + 30 * math.cos(i / 170))
            alpha = 0.45 * self.fog[oy : oy + HH, ox : ox + HW] * self.far
            a = cv2.resize(alpha, (W, H), interpolation=cv2.INTER_LINEAR)
            frame = cv2.blendLinear(frame, self.fog_color, 1.0 - a, a)
        if "flicker" in self.kinds:
            frame = cv2.convertScaleAbs(frame, alpha=0.95 + 0.05 * math.sin(i * 0.9) * math.sin(i * 0.37 + 1.3))
        if self.particles:
            layer = np.zeros((HH, HW, 3), dtype=np.uint8)
            for kind, p in self.particles:
                drift = 0.3 * np.sin(i / 20 + p[:, 5]) if kind != "rain" else 0
                p[:, 0] = (p[:, 0] + p[:, 2] + drift) % HW
                p[:, 1] = (p[:, 1] + p[:, 3]) % HH
                s = self.STRENGTH[kind]
                for x, y, vx, vy, size, ph in p:
                    if kind == "rain":
                        c = int(150 * s)
                        cv2.line(layer, (int(x), int(y)), (int(x + vx), int(y + vy)), (c, c, c + 10), 1, cv2.LINE_AA)
                    elif kind == "embers":
                        g = (0.55 + 0.45 * math.sin(i / 4 + ph)) * s
                        cv2.circle(layer, (int(x), int(y)), max(1, int(size)), (int(40 * g), int(140 * g), int(255 * g)), -1, cv2.LINE_AA)
                    else:
                        a = (0.5 + 0.5 * math.sin(i / 25 + ph)) if kind == "dust" else 1.0
                        c = int(240 * a * s)
                        cv2.circle(layer, (int(x), int(y)), max(1, int(size)), (c, c, c), -1, cv2.LINE_AA)
            layer = cv2.GaussianBlur(layer, (0, 0), 0.9)
            frame = cv2.add(frame, cv2.resize(layer, (W, H), interpolation=cv2.INTER_LINEAR))
        if "grain" in self.kinds:
            pos, neg = self.grain[i % len(self.grain)]
            frame = cv2.subtract(cv2.add(frame, pos), neg)
        return cv2.multiply(frame, self.vignette, scale=1 / 255)


def render_parallax(image: Path, seconds: float, move: str, atmosphere: set[str], out: Path, seed: int = 0) -> None:
    frames = max(1, round(seconds * settings.FPS))
    img = cover(cv2.imread(str(image), cv2.IMREAD_COLOR))
    depth = estimate_depth(img)
    camera = Camera(depth, move)
    atmo = Atmosphere(atmosphere, depth, seed)

    proc = subprocess.Popen(
        [settings.FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
         "-s", f"{W}x{H}", "-r", str(settings.FPS), "-i", "-", "-c:v", "libx264", "-preset", "ultrafast",
         "-crf", "14", "-pix_fmt", "yuv420p", str(out)],
        stdin=subprocess.PIPE,
    )
    assert proc.stdin is not None
    try:
        for i in range(frames):
            e = ease(i / max(frames - 1, 1))
            mx, my = camera.maps(e, e - 0.5)  # travel is centred on the original framing
            frame = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            proc.stdin.write(atmo.apply(frame, i).tobytes())
    finally:
        proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError(f"ffmpeg failed while encoding {out.name}")
