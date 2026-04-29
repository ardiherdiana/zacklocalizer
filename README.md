# ZackLocalizer

Sistem otomasi lokalisasi video YouTube Shorts dari Bahasa Inggris ke Bahasa Indonesia. Pipeline end-to-end mulai dari download, transkripsi, translasi, voice synthesis, hingga remaster video menggunakan FFmpeg.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 19 + TypeScript + Vite |
| Download | yt-dlp |
| Transkripsi | OpenAI Whisper API |
| Translasi | DeepL API |
| Voice Synthesis | ElevenLabs API (Multilingual v2) |
| Video Processing | FFmpeg |

---

## Alur Pipeline

```
YouTube URL
    │
    ▼
[1] Fetch metadata channel (yt-dlp) → preview video, sort by views
    │
    ▼
[2] User pilih video
    │
    ▼
[3] Download video .mp4 (resolusi tertinggi)
    │
    ▼
[4] Whisper → transkripsi audio → file .srt (Bahasa Inggris)
    │
    ▼
[5] Google Translate → terjemah .srt ke Bahasa Indonesia
    │
    ▼
[6] ElevenLabs → generate audio Indonesia (duration-matched)
    │
    ▼
[7] FFmpeg → black bar masking + burn-in subtitle + branding overlay
    │
    ▼
[8] Output video final siap download
```

---

## Struktur Proyek

```
zacklocalizer/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── ytdlp.service.ts       # Fetch metadata & download video
│   │   │   ├── whisper.service.ts     # Transkripsi audio → SRT
│   │   │   ├── translate.service.ts   # Translasi EN → ID via DeepL
│   │   │   ├── elevenlabs.service.ts  # Voice synthesis + duration matching
│   │   │   └── job.service.ts         # Job queue + SSE event emitter
│   │   ├── processor/
│   │   │   └── ffmpeg.processor.ts    # Video remaster pipeline
│   │   ├── routes/
│   │   │   ├── channel.routes.ts      # POST /api/channel/fetch
│   │   │   └── job.routes.ts          # POST/GET /api/jobs + SSE
│   │   └── index.ts
│   ├── bin/                           # ffmpeg.exe, ffprobe.exe, yt-dlp.exe
│   ├── downloads/
│   │   ├── raw/                       # Video original hasil download
│   │   ├── assets/                    # Audio & SRT hasil generate
│   │   └── final/                     # Video final hasil remaster
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChannelView.tsx        # Input URL, grid video, pagination
│   │   │   ├── JobsView.tsx           # Job list, progress bar, download link
│   │   │   └── VideoCard.tsx          # Card individual video
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## Setup & Cara Menjalankan

### 1. Prasyarat

- Node.js >= 18
- Binary `ffmpeg.exe`, `ffprobe.exe`, dan `yt-dlp.exe` ditempatkan di `backend/bin/`

### 2. Konfigurasi Environment Variables

Buat file `backend/.env` berdasarkan contoh berikut:

```env
OPENAI_API_KEY=your_openai_api_key
DEEPL_API_KEY=your_deepl_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
```

### 3. Jalankan Backend

```bash
cd backend
npm install
npm run dev
```

Backend berjalan di `http://localhost:3001`

### 4. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/channel/fetch` | Fetch metadata video dari channel YouTube |
| `POST` | `/api/jobs` | Buat job baru untuk proses video |
| `GET` | `/api/jobs` | List semua job |
| `GET` | `/api/jobs/:id` | Detail satu job |
| `GET` | `/api/jobs/:id/events` | SSE stream progress job |

---

## FFmpeg Visual Remaster

Setiap video diproses dengan 4 layer overlay:

1. **Video asli** — sebagai base layer
2. **Black bar mask** — `drawbox` solid hitam di 75% bawah frame untuk menutup subtitle asli
3. **Subtitle Indonesia** — burn-in di tengah black bar menggunakan filter `subtitles`
4. **Branding overlay** — teks statis *"Credit: Zack D. Films"* (atas) dan *"Subscribe untuk konten lainnya"* (bawah)
