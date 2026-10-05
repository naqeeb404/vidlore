# Vidlore — faceless short-video MVP

Topic in, finished 1080×1920 MP4 out (Ken Burns scenes, word-synced captions, ducked music, thumbnail).

## Layout
- `packages/core` — shared TypeScript. `src/index.ts` is client-safe (config, zod schemas). `src/server.ts` is server-only (providers, storage, renderers, timeline builder).
- `worker/` — Python render worker (`python -m vidlore_worker --timeline <key>`): Kokoro voice → faster-whisper word timings → ASS captions → FFmpeg render → thumbnail → upload → signed webhook. Same code runs locally, in Docker, and as a Cloud Run job.
- `scripts/` — CLI: `generate.ts` (end-to-end), `render-fixture.ts` (no API keys).
- `fixtures/` — sample timelines + placeholder images for render tests.
- `apps/web` — Next.js app (milestone 2).
- `supabase/migrations` — database schema (milestone 2).

## Commands
- `pnpm install`
- `pnpm render:fixture scary|history` — render a sample without API keys.
- `pnpm generate --topic "..." [--niche --style --voice --length 30|60]` — full pipeline, output in `out/`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`
- Worker venv (Windows): `py -3.12 -m venv worker/.venv && worker/.venv/Scripts/pip install -r worker/requirements.txt`
- Docker: `docker build -f worker/Dockerfile -t vidlore-worker .` then `RENDER_DRIVER=docker`.

## Contracts
- The timeline JSON (`packages/core/src/schemas.ts` `timeline`) is the only interface between TS and Python; keep `worker/vidlore_worker/timeline.py` in sync.
- Storage keys live in `keys` (`packages/core/src/storage/index.ts`); the worker uses the same layout. Every step writes its output to storage so a retry skips finished work.
- Each AI step is behind an interface + env-selected provider: `writeScript`, `generateImage` (TS, `packages/core/src/providers`), `generateVoice`, `transcribe` (Python, `worker/vidlore_worker/voice.py`, `transcribe.py`), `render` (`packages/core/src/render`). Do not add other providers without asking.

## Rules
- **Everything free**: only free tiers / open source (Netlify, Supabase, Gemini Flash, Cloudflare Workers AI + R2, Kokoro, faster-whisper, FFmpeg, Cloud Run job free tier). Ask before adding anything paid.
- **Pipeline**: `jobs` table tracks status + error. Script and images run in short Netlify functions (one scene per request); voice + captions + render run in one Cloud Run job that uploads to R2 and calls back a signed webhook. No function waits on long work. Retry a failed step once automatically.
- **Guardrails**: max 2 videos/user/day, 15/day global (`LIMITS` in `packages/core/src/config.ts`). Hitting a cap shows a friendly "Daily demo limit reached, come back tomorrow" message, never an error page.
- **Security**: RLS on every table; secrets server-only (never `NEXT_PUBLIC_*`); `.env` never committed; validate every input with zod; topic length limit + harmful-prompt block; verify webhook HMAC signature + timestamp; rate-limit generate endpoints; downloads via expiring signed URLs.
- Auth is a hardcoded demo login for now, behind an interface so Supabase Google sign-in can replace it.
- Out of scope: payments, credits, scheduling, auto-posting, teams, admin, extra emails.
