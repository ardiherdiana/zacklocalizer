export interface VideoMetadata {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
  uploadDate: string;
  description: string;
}

export type JobStatus =
  | 'pending' | 'downloading' | 'extracting_audio' | 'transcribing'
  | 'translating' | 'voicegen' | 'rendering' | 'uploading_yt' | 'done' | 'error';

export interface Job {
  id: string;
  videoId: string;
  videoTitle: string;
  videoTitleId?: string;
  videoUrl: string;
  status: JobStatus;
  progress: number;
  error?: string;
  outputPath?: string;
  outputFileName?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  createdAt: string;
  updatedAt: string;
  logs: string[];
}

export interface PaginatedVideos {
  videos: VideoMetadata[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
