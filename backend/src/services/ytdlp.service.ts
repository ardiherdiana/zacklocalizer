import { create } from 'yt-dlp-exec';
import path from 'path';
import fs from 'fs';
import type { VideoMetadata } from '../types/index';

const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const localBin = path.resolve(__dirname, '../../bin', binName);
const ytDlp = create(fs.existsSync(localBin) ? localBin : 'yt-dlp');

interface YtDlpEntry {
  id: string;
  title: string;
  url?: string;
  webpage_url?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string }>;
  duration?: number;
  view_count?: number;
  upload_date?: string;
  description?: string;
}

interface YtDlpResult {
  entries?: YtDlpEntry[];
  id?: string;
  title?: string;
}

function toVideoMetadata(entry: YtDlpEntry): VideoMetadata {
  const thumbnail =
    entry.thumbnail ??
    (Array.isArray(entry.thumbnails) && entry.thumbnails.length > 0
      ? entry.thumbnails[entry.thumbnails.length - 1].url
      : '');

  return {
    id: entry.id,
    title: entry.title ?? '',
    url: entry.webpage_url ?? entry.url ?? `https://www.youtube.com/watch?v=${entry.id}`,
    thumbnail,
    duration: entry.duration ?? 0,
    viewCount: entry.view_count ?? 0,
    uploadDate: entry.upload_date ?? '',
    description: entry.description ?? '',
  };
}

export async function fetchChannelVideos(channelUrl: string): Promise<VideoMetadata[]> {
  const result = (await ytDlp(channelUrl, {
    dumpSingleJson: true,
    flatPlaylist: true,
    noWarnings: true,
  })) as YtDlpResult;

  const entries: YtDlpEntry[] = result.entries ?? [];
  const seen = new Set<string>();
  const videos = entries
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .map(toVideoMetadata);
  videos.sort((a, b) => b.viewCount - a.viewCount);
  return videos;
}

export async function downloadVideo(
  videoUrl: string,
  outputPath: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const subprocess = ytDlp(videoUrl, {
    output: outputPath,
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    mergeOutputFormat: 'mp4',
    newline: true,
  });

  if (onProgress) {
    (subprocess as any).stdout?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      const match = line.match(/\[download\]\s+([\d.]+)%/);
      if (match) {
        onProgress(parseFloat(match[1]));
      }
    });
  }

  await subprocess;

  if (onProgress) onProgress(100);
}
