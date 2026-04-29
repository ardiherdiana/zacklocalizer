import { Router } from 'express';
import type { Request, Response } from 'express';
import { fetchChannelVideos } from '../services/ytdlp.service';
import type { PaginatedVideos } from '../types/index';

const router = Router();

// POST /api/channel/fetch
router.post('/fetch', async (req: Request, res: Response): Promise<void> => {
  const { url, page: bodyPage, pageSize: bodyPageSize } = req.body as {
    url?: string;
    page?: number;
    pageSize?: number;
  };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid channel URL is required in the request body.' });
    return;
  }

  const page = Math.max(1, Number(bodyPage ?? req.query.page ?? 1) || 1);
  const pageSize = Math.max(1, Number(bodyPageSize ?? req.query.pageSize ?? 50) || 50);

  try {
    const allVideos = await fetchChannelVideos(url);

    const total = allVideos.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const videos = allVideos.slice(start, start + pageSize);

    const result: PaginatedVideos = {
      videos,
      total,
      page,
      pageSize,
      totalPages,
    };

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[channel/fetch] Error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
