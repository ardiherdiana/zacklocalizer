import type { VideoMetadata } from './types';

const BASE = 'http://localhost:3001/api';

export const api = {
  fetchVideos: (url: string, page: number, pageSize: number) =>
    fetch(`${BASE}/channel/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, page, pageSize }),
    }).then(r => r.json()),

  createJobs: (videos: VideoMetadata[], startFrom: number) =>
    fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos, startFrom }),
    }).then(r => r.json()),

  getJobs: () => fetch(`${BASE}/jobs`).then(r => r.json()),

  deleteJob: (id: string) =>
    fetch(`${BASE}/jobs/${id}`, { method: 'DELETE' }),

  deleteAllJobs: () =>
    fetch(`${BASE}/jobs`, { method: 'DELETE' }),
};
