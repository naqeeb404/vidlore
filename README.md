# Vidlore

**Stories that tell themselves.** Pick a niche, a style and a voice, type a topic — Vidlore writes the script, paints the scenes, records the voiceover, syncs word-by-word captions and renders a 1080×1920 MP4 ready for TikTok, Reels and Shorts.

Everything runs on free tiers or open source: Gemini Flash (script), Cloudflare Workers AI flux-1-schnell (images), Kokoro (voice), faster-whisper (caption timing), FFmpeg (render).

## Status

- [x] Milestone 1 — render worker + CLI
- [ ] Milestone 2 — web app
- [ ] Milestone 3 — deploy (Netlify + Cloud Run)

## Local setup

Prerequisites: Node 20+, pnpm 10, Python 3.12, FFmpeg on `PATH` (Windows: `winget install Gyan.FFmpeg`). Docker is optional locally.

```bash
pnpm install
```

```bash
py -3.12 -m venv worker/.venv
```

```bash
worker/.venv/Scripts/pip install -r worker/requirements.txt
```

(macOS/Linux: use `python3.12` and `worker/.venv/bin/...`, and set `WORKER_PYTHON=./worker/.venv/bin/python` in `.env`.)

Copy `.env.example` to `.env`. For the fixture renders no keys are needed; for `pnpm generate` fill in:

| Variable | Where to get it (free) |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages (right sidebar) |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → "Workers AI" template |

The first render downloads the Kokoro model (~350 MB) and Whisper `base.en` (~150 MB) into `worker/models/`.

## Commands

```bash
pnpm render:fixture scary
```

Renders a bundled 30-second sample (placeholder art) to `storage/jobs/fixture-scary/video.mp4`. `history` is a 60-second sample.

```bash
pnpm generate --topic "The dancing plague of 1518" --niche history --style cinematic --length 60
```

Full pipeline; the MP4 and thumbnail land in `out/`. Options: `--niche scary|history|motivation|facts|mythology`, `--style cinematic|anime|dark-fantasy|comic`, `--voice am_fenrir|am_michael|af_heart|bf_emma`, `--length 30|60`.

### Docker worker

```bash
docker build -f worker/Dockerfile -t vidlore-worker .
```

Then set `RENDER_DRIVER=docker` in `.env`. The image bakes in the models and the Montserrat font, and is the same image deployed as the Cloud Run job.

## Background music

Music is synthesized per video (`worker/vidlore_worker/music.py`), so there are no licensing questions. To use real tracks, drop CC0 or licensed files named `<mood>-*.mp3` (`dark`, `mystery`, `uplift`, `warm`) into `assets/music/`.

## Architecture

See [CLAUDE.md](CLAUDE.md).
