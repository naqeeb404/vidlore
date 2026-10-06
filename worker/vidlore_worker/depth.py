"""Monocular depth with Depth Anything V2 Small (ONNX, CPU). Returns 0 = far, 1 = near."""
from __future__ import annotations

import threading

import cv2
import numpy as np

from . import models, settings

_session = None
_lock = threading.Lock()
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _get_session():
    global _session
    with _lock:
        if _session is None:
            import onnxruntime as ort

            path = models.ensure(settings.DEPTH_MODEL_URL, "depth-anything-v2-small.onnx")
            opts = ort.SessionOptions()
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            _session = ort.InferenceSession(str(path), opts, providers=["CPUExecutionProvider"])
    return _session


def estimate_depth(bgr: np.ndarray) -> np.ndarray:
    """Depth map at the input's resolution, float32 in [0, 1], smoothed for warping."""
    h, w = bgr.shape[:2]
    # Model works on multiples of 14; ~518 px on the short side is its native scale.
    scale = 518 / min(h, w)
    ih, iw = int(round(h * scale / 14)) * 14, int(round(w * scale / 14)) * 14
    rgb = cv2.cvtColor(cv2.resize(bgr, (iw, ih), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    x = ((rgb.astype(np.float32) / 255.0 - MEAN) / STD).transpose(2, 0, 1)[None]
    pred = _get_session().run(None, {"pixel_values": x})[0][0]

    # Relative inverse depth: larger = closer. Normalize robustly, then smooth so warps don't tear edges.
    lo, hi = np.percentile(pred, [2, 98])
    d = np.clip((pred - lo) / max(hi - lo, 1e-6), 0, 1).astype(np.float32)
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    k = max(3, (min(h, w) // 40) | 1)
    return cv2.GaussianBlur(d, (k, k), 0)
