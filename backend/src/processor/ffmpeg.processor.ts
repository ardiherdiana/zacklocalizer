import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const localFfmpeg = path.resolve(__dirname, '../../bin/ffmpeg.exe');
const localFfprobe = path.resolve(__dirname, '../../bin/ffprobe.exe');
if (fs.existsSync(localFfmpeg)) ffmpeg.setFfmpegPath(localFfmpeg);
if (fs.existsSync(localFfprobe)) ffmpeg.setFfprobePath(localFfprobe);

export function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export interface VideoDimensions {
  width: number;
  height: number;
  duration: number;
}

export function getVideoDimensions(videoPath: string): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found in file: ' + videoPath));
      }

      resolve({
        width: videoStream.width ?? 1920,
        height: videoStream.height ?? 1080,
        duration: metadata.format.duration ?? 0,
      });
    });
  });
}

/**
 * Escape an SRT path for use inside the FFmpeg subtitles filter on Windows.
 * Backslashes are converted to forward slashes and the drive-letter colon is escaped.
 */
function escapeSrtPath(srtPath: string): string {
  return srtPath.replace(/\\/g, '/').replace(':', '\\\\:');
}

export interface RemasterOptions {
  videoPath: string;
  srtPath: string;
  generatedAudioPath: string;
  outputPath: string;
}

const BUBBLES_FONT = path.resolve(__dirname, '../../bin/bubbles.ttf').replace(/\\/g, '/').replace(':', '\\\\:');
const FALLBACK_FONT = 'C\\\\:/Windows/Fonts/arial.ttf';

function getFontFile(): string {
  const localPath = path.resolve(__dirname, '../../bin/bubbles.ttf');
  return fs.existsSync(localPath) ? BUBBLES_FONT : FALLBACK_FONT;
}

export function remasterVideo(options: RemasterOptions): Promise<void> {
  const { videoPath, srtPath, generatedAudioPath, outputPath } = options;

  const escapedSrt = escapeSrtPath(srtPath);
  const fontFile = getFontFile();
  const hasBubbles = fs.existsSync(path.resolve(__dirname, '../../bin/bubbles.ttf'));
  const fontsDir = hasBubbles
    ? path.resolve(__dirname, '../../bin').replace(/\\/g, '/').replace(':', '\\\\:')
    : 'C\\\\:/Windows/Fonts';
  const fontName = hasBubbles ? 'Bubbles' : 'Arial';

  const complexFilter = [
    // 1. Black bar bottom 25%
    '[0:v]drawbox=x=0:y=ih*0.75:w=iw:h=ih*0.25:color=black:t=fill[boxed]',
    // 2. Subtitle per-kata — lebih kecil, sedikit lebih atas
    `[boxed]subtitles=${escapedSrt}:force_style='Fontname=${fontName},Fontsize=13,Alignment=2,MarginV=35,PrimaryColour=&Hffffff&,Bold=1':fontsdir=${fontsDir}[subbed]`,
    // 3. Credit watermark atas — lebih besar
    `[subbed]drawtext=text='Credit\\: Zack D. Films':fontfile=${fontFile}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=20[branded]`,
    // 4. Follow CTA bawah — lebih besar
    `[branded]drawtext=text='Follow untuk konten lainnya':fontfile=${fontFile}:fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=h*0.93[final]`,
  ];

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(generatedAudioPath)
      .complexFilter(complexFilter)
      .outputOptions(['-map [final]', '-map 1:a', '-shortest'])
      .videoCodec('libx264')
      .audioCodec('aac')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
