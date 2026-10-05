import os
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = WORKER_DIR.parent

FPS = 30
WIDTH, HEIGHT = 1080, 1920
SAMPLE_RATE = 24000  # Kokoro output rate

MODELS_DIR = Path(os.environ.get("MODELS_DIR", WORKER_DIR / "models"))
KOKORO_MODEL_URL = os.environ.get(
    "KOKORO_MODEL_URL",
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
)
KOKORO_VOICES_URL = os.environ.get(
    "KOKORO_VOICES_URL",
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
)
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base.en")

FONTS_DIR = Path(os.environ.get("FONTS_DIR", REPO_DIR / "assets" / "fonts"))
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")

SCENE_PAUSE_SEC = 0.35
TAIL_SEC = 0.9
TRANSITION_SEC = 0.3
