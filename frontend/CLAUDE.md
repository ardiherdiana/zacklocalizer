# 🚀 Project: ZackLocalizer (Automated Video Localization System)

## 📌 Background
Proyek ini bertujuan untuk melakukan otomasi penuh (End-to-End) pengunduhan, penerjemahan, dan pengeditan video YouTube Shorts (khususnya dari channel seperti Zack D. Films) untuk audiens Indonesia. Sistem dibangun menggunakan **Node.js**, **TypeScript**, dan **FFmpeg**.

## 🏗️ Core Stack
- **Runtime:** Node.js (TypeScript)
- **Engine:** `yt-dlp` (via `yt-dlp-exec`)
- **Video/Audio Processing:** `fluent-ffmpeg`
- **AI Services:**
    - Transcription: OpenAI Whisper API
    - Translation: DeepL / Google Translate API
    - Voice Synthesis: ElevenLabs API (Multilingual v2)

## 🛠️ System Workflow (The Automata)

### Phase 1: Ingestion & Metadata
1.  **Input:** URL Channel YouTube.
2.  **Fetch:** Ambil metadata video menggunakan `yt-dlp` dengan flag `--dump-json`.
3.  **Sort & Page:** Urutkan berdasarkan `view_count` tertinggi. Tampilkan preview per 50 video dengan pagination.
4.  **Select:** Pengguna memilih video (atau Select All).

### Phase 2: Processing Pipeline (Per Video)
1.  **Download:** Tarik video resolusi tertinggi (format .mp4).
2.  **Transcribe:** Ekstrak audio -> Kirim ke Whisper -> Dapatkan file `.srt` Inggris.
3.  **Translate:** Terjemahkan teks `.srt` ke Bahasa Indonesia.
4.  **VoiceGen:** Kirim teks hasil translate ke ElevenLabs. 
    - *Constraint:* Durasi audio output harus disesuaikan (speed-up/down) agar match dengan durasi asli.

### Phase 3: Visual Remastering (FFmpeg)
Untuk menghilangkan gangguan visual dari subtitle asli, gunakan teknik **Black Bar Masking**:
- **Layer 1:** Video asli sebagai dasar.
- **Layer 2 (The Mask):** Gambar `drawbox` solid hitam pada koordinat `y = 75%` dari tinggi video sampai ke bawah.
- **Layer 3 (Subtitles):** Burn-in subtitle Indonesia di tengah-tengah Black Bar menggunakan filter `subtitles`.
- **Layer 4 (Branding):** Tambahkan text overlay statis:
    - *"Credit: Zack D. Films"* (Top/Center)
    - *"Follow untuk konten lainnya"* (Bottom/Center - di bawah subtitle).

## 📂 Directory Structure
```text

/project-root
├── /src
│   ├── /services (yt-dlp, elevenlabs, whisper)
│   ├── /processor (ffmpeg-logic, srt-generator)
│   └── index.ts
├── /downloads
│   ├── /raw (original video)
│   ├── /assets (audio generated, srt files)
│   └── /final (processed video)
├── .env (API Keys)
└── package.json