# Vidlore — faceless short-video MVP

Topic in, finished 1080×1920 MP4 out (Ken Burns scenes, word-synced captions, ducked music, thumbnail).

## Layout
- `packages/core` — shared TypeScript. `src/index.ts` is client-safe (config, zod schemas). `src/server.ts` is server-only (providers, storage, renderers, timeline builder).
- `worker/` — Python render worker (`python -m vidlore_worker --timeline <key>`): Kokoro voice → faster-whisper word timings → ASS captions → per-scene shots (real Pexels clip, or AI image through the 2.5D camera engine in `motion.py` + `depth.py`) → FFmpeg final mix → thumbnail → upload → signed webhook. Same code runs locally, in Docker, and as a Cloud Run job.
- `scripts/` — CLI: `generate.ts` (end-to-end), `render-fixture.ts` (no API keys).
- `fixtures/` — sample timelines + placeholder images for render tests.
- `apps/web` — Next.js 16 app (App Router, Tailwind v4). Read `apps/web/AGENTS.md`: Next 16 has breaking changes (async `params`, Turbopack default). Server-only code lives in `apps/web/src/server`.

## Commands
- `pnpm install`
- `pnpm render:fixture scary|history` — render a sample without API keys.
- `pnpm generate --topic "..." [--niche --style --voice --length 30|60]` — full pipeline, output in `out/`.
- `pnpm --filter @vidlore/web dev` — web app on http://localhost:3000 (reads the root `.env`)
- `pnpm typecheck`, `pnpm lint`, `pnpm build`
- Worker venv (Windows): `py -3.12 -m venv worker/.venv && worker/.venv/Scripts/pip install -r worker/requirements.txt`
- Docker: `docker build -f worker/Dockerfile -t vidlore-worker .` then `RENDER_DRIVER=docker`.

## Contracts
- The timeline JSON (`packages/core/src/schemas.ts` `timeline`) is the only interface between TS and Python; keep `worker/vidlore_worker/timeline.py` in sync.
- Storage keys live in `keys` (`packages/core/src/storage/index.ts`); the worker uses the same layout. Every step writes its output to storage so a retry skips finished work.
- Each AI step is behind an interface + env-selected provider: `writeScript`, `generateImage`, `findStockVideo` (TS, `packages/core/src/providers`; `makeSceneAsset` in `scenes.ts` picks stock vs AI per scene), `generateVoice`, `transcribe` (Python, `worker/vidlore_worker/voice.py`, `transcribe.py`), `render` (`packages/core/src/render`). Do not add other providers without asking.

## No accounts, no database
- The user dropped login and Supabase. Anyone can create, watch and download a video.
- Each job is a JSON file in storage (`jobs/{id}/job.json`, schema `job` in `packages/core/src/schemas.ts`). Status flow: `writing_script → script_ready → making_images → recording_voice → rendering → done | failed`.
- Ownership: creating a job returns a random owner token (only its SHA-256 is stored). The browser keeps `{id, token}` in localStorage ("My videos") and sends it as `x-owner-token` to edit, make or delete. Anyone with the link can view a finished video.
- Daily caps are counted per visitor (salted hash of the IP, `apps/web/src/server/usage.ts`) and globally in `usage/{date}.json`. Running out of the Cloudflare image quota also shows the daily-limit message.

## Rules
- **Everything free**: only free tiers / open source (Netlify, Gemini Flash, Pexels, Cloudflare Workers AI + R2, Depth Anything V2 Small (Apache-2.0), Kokoro, faster-whisper, FFmpeg, Cloud Run job free tier). Ask before adding anything paid.
- **Pipeline**: the job record tracks status + error. Script and images run in short Netlify functions (one scene per request); voice + captions + render run in one Cloud Run job that uploads to R2 and calls back a signed webhook. No function waits on long work. Retry a failed step once automatically.
- **Guardrails**: max 2 videos/user/day, 15/day global (`LIMITS` in `packages/core/src/config.ts`). Hitting a cap shows a friendly "Daily demo limit reached, come back tomorrow" message, never an error page.
- **Security**: secrets server-only (never `NEXT_PUBLIC_*`); `.env` never committed; validate every input with zod; topic length limit + harmful-prompt block; verify webhook HMAC signature + timestamp; rate-limit generate endpoints; downloads via expiring signed URLs.
- **Free-tier budget**: Cloudflare gives 10,000 neurons/day; flux-schnell at 4 steps is ~58 neurons per image. Keep `steps: 4`.
- **Real video only**: the user explicitly does not want image slideshows. Every web-app scene is a real filmed clip (Pexels/Pixabay, visuals mode "stock"). Paid AI video APIs (Veo, Seedance) are off-limits. AI images + the parallax engine exist only for the CLI's `--visuals ai`.
- Out of scope: accounts, payments, credits, scheduling, auto-posting, teams, admin, emails.
