export interface VideoMetadata {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number; // seconds
  viewCount: number;
  uploadDate: string;
  description: string;
}

export type JobStatus =
  | 'pending'
  | 'downloading'
  | 'extracting_audio'
  | 'transcribing'
  | 'translating'
  | 'voicegen'
  | 'rendering'
  | 'uploading_yt'
  | 'done'
  | 'error';

export interface Job {
  id: string;
  videoId: string;
  videoTitle: string;
  videoTitleId?: string;       // Translated Indonesian title
  videoDescription: string;    // Original description (for YT upload)
  videoUrl: string;
  status: JobStatus;
  progress: number; // 0-100
  error?: string;
  outputPath?: string;
  outputFileName?: string;
  youtubeVideoId?: string;     // YouTube video ID after upload
  youtubeUrl?: string;         // Full YouTube URL after upload
  createdAt: string;
  updatedAt: string;
  logs: string[];
}

export interface SrtEntry {
  index: number;
  startTime: string; // "00:00:01,000"
  endTime: string;
  text: string;
}

export interface PaginatedVideos {
  videos: VideoMetadata[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
