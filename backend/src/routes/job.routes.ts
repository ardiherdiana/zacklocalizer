import { Router } from 'express';
import type { Request, Response } from 'express';
import { enqueueJob, getAllJobs, getJob, deleteJob, deleteAllJobs, jobEvents, setJobCounter } from '../services/job.service';
import type { Job, VideoMetadata } from '../types/index';

const router = Router();

// POST /api/jobs — enqueue jobs for an array of videos
router.post('/', (req: Request, res: Response): void => {
  const { videos, startFrom } = req.body as { videos?: VideoMetadata[]; startFrom?: number };

  if (!Array.isArray(videos) || videos.length === 0) {
    res.status(400).json({ error: 'Request body must include a non-empty "videos" array.' });
    return;
  }

  if (typeof startFrom === 'number' && startFrom >= 1) {
    setJobCounter(startFrom - 1);
  }

  const createdJobs = videos.map((video) => enqueueJob(video));
  res.status(201).json(createdJobs);
});

// GET /api/jobs — list all jobs
router.get('/', (_req: Request, res: Response): void => {
  res.json(getAllJobs());
});

// GET /api/jobs/:id — get a single job
router.get('/:id', (req: Request, res: Response): void => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json(job);
});

// GET /api/jobs/:id/events — Server-Sent Events for real-time updates
router.get('/:id/events', (req: Request, res: Response): void => {
  const { id } = req.params;

  const job = getJob(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send the current state immediately
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  const onUpdate = (updatedJob: Job) => {
    if (updatedJob.id !== id) return;
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);

    // Close the stream once the job reaches a terminal state
    if (updatedJob.status === 'done' || updatedJob.status === 'error') {
      jobEvents.off('update', onUpdate);
      res.end();
    }
  };

  jobEvents.on('update', onUpdate);

  req.on('close', () => {
    jobEvents.off('update', onUpdate);
  });
});

// DELETE /api/jobs — delete all jobs
router.delete('/', (_req: Request, res: Response): void => {
  deleteAllJobs();
  res.status(204).end();
});

// DELETE /api/jobs/:id — delete a single job
router.delete('/:id', (req: Request, res: Response): void => {
  const deleted = deleteJob(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.status(204).end();
});

export default router;
