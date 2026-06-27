# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
cd backend
npm run dev      # ts-node with nodemon (hot reload)
npm run build    # tsc compile to dist/
npm start        # run compiled dist/index.js
```

### Frontend (`frontend/`)
```bash
cd frontend
npm run dev      # Vite dev server (proxies /api to :3001)
npm run build    # tsc + vite build
npm run lint     # eslint
```

Both must run simultaneously during development. Backend runs on port **3001**, frontend on Vite's default **5173**.

## Architecture

### Pipeline (the core loop)
Each video goes through a linear pipeline managed by `backend/src/services/job.service.ts`. Jobs are held in-memory (a `Map<string, Job>`), with concurrency controlled by `pLimit(3)` for general jobs and `pLimit(1)` for ElevenLabs (which rejects concurrent requests for the same voice).

Pipeline stages (in order):
1. **Download** — `yt-dlp-exec` pulls the video to `downloads/raw/`
2. **Extract audio** — FFmpeg strips audio to `downloads/assets/`
3. **Transcribe** — OpenAI Whisper API → English `.srt`
4. **Translate** — Google Translate API → Indonesian `.srt` + translated title
5. **Voice synthesis** (`voicegen`) — ElevenLabs TTS → MP3, then FFmpeg time-stretches it to match original video duration, then Whisper re-runs on the adjusted audio for word-timed subtitles (all three sub-steps share the `voicegen` status)
6. **Render** — FFmpeg composites: original video + black bar mask at 75% height + burned-in Indonesian subtitles + branding overlays → `downloads/final/`
7. **Upload (optional)** — YouTube Data API v3 upload if `YOUTUBE_AUTO_POST=true` and OAuth is authorized

Job status updates are emitted via `EventEmitter` (`jobEvents`) which the job route streams to the frontend via SSE.

### Backend structure
```
backend/src/
  index.ts                  # Express app, route mounting
  types/index.ts            # Shared types: Job, JobStatus, VideoMetadata, SrtEntry
  routes/
    channel.routes.ts       # GET /api/channel — fetch + paginate channel videos via yt-dlp
    job.routes.ts           # POST /api/jobs, GET /api/jobs, SSE stream, delete
    youtube.routes.ts       # GET /api/youtube/status|auth|callback, POST /api/youtube/autopost
  services/
    job.service.ts          # Job lifecycle, pipeline orchestration
    ytdlp.service.ts        # yt-dlp wrapper
    whisper.service.ts      # OpenAI Whisper (segment + word-level)
    translate.service.ts    # Google Translate v2 SDK (text + SRT batch translation)
    elevenlabs.service.ts   # ElevenLabs TTS + duration adjustment
    youtube.service.ts      # YouTube OAuth + upload
  processor/
    ffmpeg.processor.ts     # extractAudio, getVideoDimensions, remasterVideo
    srt.generator.ts        # writeSrt helper
```

### Frontend structure
Two-tab React SPA (`ChannelView` | `JobsView`). No routing library — tab state is in `App.tsx`.

- **ChannelView** — takes a YouTube channel URL, fetches paginated video list, lets user select videos and enqueue jobs
- **JobsView** — polls/streams job status, shows progress, logs, and links to final output
- **VideoCard** — renders a single video with thumbnail, metadata, and select checkbox

Styling uses Tailwind utility classes (configured in `vite.config.ts` / `App.css`).

## Required environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Translate v2 (used via `@google-cloud/translate` SDK) |
| `OPENAI_API_KEY` | Whisper transcription |
| `ELEVENLABS_API_KEY` | TTS voice synthesis |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice (default: Rachel) |
| `DOWNLOADS_DIR` | Output directory (default: `./downloads`) |
| `YOUTUBE_AUTO_POST` | `true` to enable YouTube auto-upload |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | YouTube OAuth credentials |
| `YOUTUBE_REDIRECT_URI` | OAuth redirect URI (default: `http://localhost:3001/api/youtube/callback`) |
| `YOUTUBE_PRIVACY` | Upload privacy: `public` (default), `private`, or `unlisted` |

## Key design constraints

- **Jobs are in-memory only** — restarting the backend clears all jobs. There is no database.
- **YouTube OAuth tokens** — persisted to `backend/youtube_tokens.json` on disk and reloaded on startup; OAuth flow at `GET /api/youtube/auth` → redirect → `GET /api/youtube/callback`.
- **ElevenLabs concurrency** — `pLimit(1)` on ElevenLabs calls is intentional; parallel requests with the same voice ID are rejected by the API.
- **FFmpeg black bar mask** — the subtitle burn-in approach overlays a solid black box at the bottom 25% of the frame to cover original subtitles, then renders Indonesian subtitles inside that box.
- **Output filename format** — `#<counter> <sanitized-Indonesian-title>.mp4`, where counter increments globally per server session.
