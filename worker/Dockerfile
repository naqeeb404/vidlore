# Vidlore render worker: Kokoro TTS + faster-whisper + Depth Anything (3D camera) + FFmpeg.
# Build from the repo root:  docker build -f worker/Dockerfile -t vidlore-worker .
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/requirements.txt worker/requirements.txt
RUN pip install --no-cache-dir -r worker/requirements.txt

# Bake models into the image so Cloud Run jobs start without downloads.
ENV MODELS_DIR=/app/worker/models \
    FONTS_DIR=/app/assets/fonts \
    PYTHONUNBUFFERED=1
RUN mkdir -p $MODELS_DIR $FONTS_DIR \
 && curl -fsSL -o $MODELS_DIR/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
 && curl -fsSL -o $MODELS_DIR/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin \
 && curl -fsSL -o $MODELS_DIR/depth-anything-v2-small.onnx https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx \
 && curl -fsSL -o $FONTS_DIR/Montserrat-ExtraBold.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf" \
 && python -c "from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8', download_root='$MODELS_DIR/whisper')"

COPY assets/ assets/
COPY worker/vidlore_worker worker/vidlore_worker

WORKDIR /app/worker
ENTRYPOINT ["python", "-m", "vidlore_worker"]
