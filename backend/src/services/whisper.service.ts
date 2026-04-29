import fs from 'fs';
import OpenAI from 'openai';
import type { SrtEntry } from '../types/index';
import { secondsToSrtTime } from '../processor/srt.generator';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function parseSrt(srtContent: string): SrtEntry[] {
  const entries: SrtEntry[] = [];

  // Split on blank lines to get each subtitle block
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) continue;

    const index = parseInt(lines[0].trim(), 10);
    if (isNaN(index)) continue;

    const timeParts = lines[1].split(' --> ');
    if (timeParts.length !== 2) continue;

    const startTime = timeParts[0].trim();
    const endTime = timeParts[1].trim();

    const text = lines.slice(2).join('\n').trim();

    entries.push({ index, startTime, endTime, text });
  }

  return entries;
}

export async function transcribeAudio(audioPath: string): Promise<SrtEntry[]> {
  const file = fs.createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'srt',
  });

  const srtContent = response as unknown as string;
  return parseSrt(srtContent);
}

export async function transcribeAudioWordLevel(audioPath: string): Promise<SrtEntry[]> {
  const file = fs.createReadStream(audioPath);

  const response = await (openai.audio.transcriptions.create as Function)({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  const result = response as unknown as {
    words: Array<{ word: string; start: number; end: number }>;
  };

  return (result.words ?? []).map((w, i) => ({
    index: i + 1,
    startTime: secondsToSrtTime(w.start),
    endTime: secondsToSrtTime(w.end),
    text: w.word.trim(),
  }));
}
