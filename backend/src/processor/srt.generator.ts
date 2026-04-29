import fs from 'fs/promises';
import type { SrtEntry } from '../types/index';

export function parseSrtTime(timeStr: string): number {
  // Format: "HH:MM:SS,ms"
  const [timePart, msPart] = timeStr.split(',');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const ms = parseInt(msPart ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

export function secondsToSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const secs = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mins = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)},${pad3(ms)}`;
}

export function srtToString(entries: SrtEntry[]): string {
  return entries
    .map(
      (entry) =>
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`,
    )
    .join('\n\n');
}

export async function writeSrt(entries: SrtEntry[], filePath: string): Promise<void> {
  const content = srtToString(entries);
  await fs.writeFile(filePath, content, 'utf-8');
}

export function getSubtitleYPosition(videoHeight: number): number {
  return Math.floor(videoHeight * 0.78);
}

export function expandToWordLevel(entries: SrtEntry[]): SrtEntry[] {
  const result: SrtEntry[] = [];
  let index = 1;

  for (const entry of entries) {
    const words = entry.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const startSec = parseSrtTime(entry.startTime);
    const endSec = parseSrtTime(entry.endTime);
    const msPerWord = (endSec - startSec) / words.length;

    for (let i = 0; i < words.length; i++) {
      result.push({
        index: index++,
        startTime: secondsToSrtTime(startSec + i * msPerWord),
        endTime: secondsToSrtTime(startSec + (i + 1) * msPerWord),
        text: words[i],
      });
    }
  }

  return result;
}
