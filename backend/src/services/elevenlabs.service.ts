import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface SynthesisResult {
  audio: Buffer;
  wordTimings: WordTiming[];
}

interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

function buildWordTimings(alignment: ElevenLabsAlignment): WordTiming[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  const words: WordTiming[] = [];
  let wordChars = '';
  let wordStart: number | null = null;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    if (char === ' ' || char === '\n') {
      if (wordChars && wordStart !== null) {
        words.push({ word: wordChars, start: wordStart, end: character_end_times_seconds[i - 1] });
        wordChars = '';
        wordStart = null;
      }
    } else {
      if (wordStart === null) wordStart = character_start_times_seconds[i];
      wordChars += char;
    }
  }

  if (wordChars && wordStart !== null) {
    words.push({ word: wordChars, start: wordStart, end: character_end_times_seconds[characters.length - 1] });
  }

  return words;
}

export async function synthesizeSpeech(text: string, voiceId: string): Promise<SynthesisResult> {
  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/with-timestamps`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errText}`);
  }

  const json = await response.json() as { audio_base64: string; alignment: ElevenLabsAlignment };
  const audio = Buffer.from(json.audio_base64, 'base64');
  const wordTimings = buildWordTimings(json.alignment);

  return { audio, wordTimings };
}

function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration ?? 0;
      resolve(duration);
    });
  });
}

function buildAtempoFilters(factor: number): string[] {
  const filters: string[] = [];

  // atempo must be between 0.5 and 2.0; chain multiple filters for values outside that range
  if (factor < 0.5) {
    let remaining = factor;
    while (remaining < 0.5) {
      filters.push('atempo=0.5');
      remaining /= 0.5;
    }
    if (remaining !== 1) {
      filters.push(`atempo=${remaining.toFixed(6)}`);
    }
  } else if (factor > 2.0) {
    let remaining = factor;
    while (remaining > 2.0) {
      filters.push('atempo=2.0');
      remaining /= 2.0;
    }
    if (remaining !== 1) {
      filters.push(`atempo=${remaining.toFixed(6)}`);
    }
  } else {
    filters.push(`atempo=${factor.toFixed(6)}`);
  }

  return filters;
}

export async function adjustAudioDuration(
  inputPath: string,
  targetDuration: number,
  outputPath: string,
): Promise<void> {
  const audioDuration = await getAudioDuration(inputPath);

  if (audioDuration <= 0 || targetDuration <= 0) {
    // Nothing to adjust — just copy the file
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const factor = audioDuration / targetDuration;
  const atempoFilters = buildAtempoFilters(factor);
  const filterStr = atempoFilters.join(',');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(filterStr)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
