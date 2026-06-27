import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import type { Job, VideoMetadata } from '../types/index';
import { downloadVideo } from './ytdlp.service';
import { extractAudio, getVideoDimensions, remasterVideo } from '../processor/ffmpeg.processor';
import { transcribeAudio, transcribeAudioWordLevel } from './whisper.service';
import { translateSrt, translateText } from './translate.service';
import { synthesizeSpeech, adjustAudioDuration } from './elevenlabs.service';
import { writeSrt } from '../processor/srt.generator';

export const jobEvents = new EventEmitter();

const jobs = new Map<string, Job>();
const limiter = pLimit(3);
let jobCounter = 0;

export function setJobCounter(n: number): void {
  jobCounter = n;
}

function sanitizeFilename(title: string): string {
  return title.replace(/[/\\:*?"<>|]/g, '').trim().slice(0, 80);
}
const elevenLabsLimiter = pLimit(1); // ElevenLabs rejects concurrent requests for same voice

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || './downloads';

function ensureDirs(): void {
  ['raw', 'assets', 'final'].forEach((dir) => {
    fs.mkdirSync(path.join(DOWNLOADS_DIR, dir), { recursive: true });
  });
}

export function createJob(video: VideoMetadata): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: uuidv4(),
    videoId: video.id,
    videoTitle: video.title,
    videoDescription: video.description ?? '',
    videoUrl: video.url,
    status: 'pending',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    logs: [],
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

export function updateJob(id: string, updates: Partial<Job>): void {
  const job = jobs.get(id);
  if (!job) return;

  const updated: Job = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);
  jobEvents.emit('update', updated);
}

function addLog(jobId: string, message: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const logs = [...job.logs, `[${new Date().toISOString()}] ${message}`];
  updateJob(jobId, { logs });
}

export async function processJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  try {
    ensureDirs();

    // Paths
    const rawVideoPath = path.join(DOWNLOADS_DIR, 'raw', `${jobId}.mp4`);
    const originalAudioPath = path.join(DOWNLOADS_DIR, 'assets', `${jobId}_original.mp3`);
    const enSrtPath = path.join(DOWNLOADS_DIR, 'assets', `${jobId}_en.srt`);
    const idSrtPath = path.join(DOWNLOADS_DIR, 'assets', `${jobId}_id.srt`);
    const voicePath = path.join(DOWNLOADS_DIR, 'assets', `${jobId}_voice.mp3`);
    const voiceAdjustedPath = path.join(DOWNLOADS_DIR, 'assets', `${jobId}_voice_adj.mp3`);
    const num = ++jobCounter;

    // 1. Download
    updateJob(jobId, { status: 'downloading', progress: 10 });
    addLog(jobId, `Downloading video: ${job.videoUrl}`);
    await downloadVideo(job.videoUrl, rawVideoPath, (pct) => {
      addLog(jobId, `Download progress: ${pct}%`);
    });
    addLog(jobId, 'Download complete');

    // 2. Extract audio
    updateJob(jobId, { status: 'extracting_audio', progress: 20 });
    addLog(jobId, 'Extracting audio');
    await extractAudio(rawVideoPath, originalAudioPath);
    addLog(jobId, 'Audio extraction complete');

    // 3. Transcribe
    updateJob(jobId, { status: 'transcribing', progress: 35 });
    addLog(jobId, 'Transcribing audio with Whisper');
    const enEntries = await transcribeAudio(originalAudioPath);
    await writeSrt(enEntries, enSrtPath);
    addLog(jobId, `Transcription complete — ${enEntries.length} entries`);

    // 4. Translate subtitles + title
    updateJob(jobId, { status: 'translating', progress: 50 });
    addLog(jobId, 'Translating subtitles and title to Indonesian');
    const [idEntries, videoTitleId] = await Promise.all([
      translateSrt(enEntries, 'ID'),
      translateText(job.videoTitle, 'ID'),
    ]);
    await writeSrt(idEntries, idSrtPath);
    updateJob(jobId, { videoTitleId });
    addLog(jobId, `Translation complete — judul: "${videoTitleId}"`);

    // Determine output filename using Indonesian title
    const outputFileName = `#${num} ${sanitizeFilename(videoTitleId)}.mp4`;
    const outputPath = path.join(DOWNLOADS_DIR, 'final', outputFileName);

    // 5. Voice generation
    updateJob(jobId, { status: 'voicegen', progress: 65 });
    addLog(jobId, 'Getting video dimensions / duration');
    const { duration: videoDuration } = await getVideoDimensions(rawVideoPath);

    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
    const combinedText = idEntries.map((e) => e.text).join(' ');
    addLog(jobId, 'Synthesizing speech via ElevenLabs');
    const { audio: audioBuffer } = await elevenLabsLimiter(() => synthesizeSpeech(combinedText, voiceId));
    fs.writeFileSync(voicePath, audioBuffer);
    addLog(jobId, 'Speech synthesis complete');

    addLog(jobId, `Adjusting audio duration to ${videoDuration.toFixed(2)}s`);
    await adjustAudioDuration(voicePath, videoDuration, voiceAdjustedPath);
    addLog(jobId, 'Audio duration adjusted');

    // Transcribe adjusted audio with Whisper word-level — timestamps match the final audio
    addLog(jobId, 'Detecting word timestamps from generated audio');
    const wordSrtEntries = await transcribeAudioWordLevel(voiceAdjustedPath);
    await writeSrt(wordSrtEntries, idSrtPath);
    addLog(jobId, `Word-level SRT built — ${wordSrtEntries.length} words`);

    // 6. Render
    updateJob(jobId, { status: 'rendering', progress: 80 });
    addLog(jobId, 'Rendering final video');
    await remasterVideo({
      videoPath: rawVideoPath,
      srtPath: idSrtPath,
      generatedAudioPath: voiceAdjustedPath,
      outputPath,
    });
    addLog(jobId, 'Render complete');

    // 7. Done
    updateJob(jobId, { status: 'done', progress: 100, outputPath, outputFileName });
    addLog(jobId, 'Job finished successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Job ${jobId}] Error:`, message);
    addLog(jobId, `ERROR: ${message}`);
    updateJob(jobId, { status: 'error', error: message });
  }
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function deleteAllJobs(): void {
  jobs.clear();
}

export function enqueueJob(video: VideoMetadata): Job {
  const job = createJob(video);
  limiter(() => processJob(job.id));
  return job;
}
