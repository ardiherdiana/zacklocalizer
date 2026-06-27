import { useState, useEffect, useCallback } from 'react';
import type { Job, JobStatus } from '../types';
import { api } from '../api';
import { formatDate } from '../utils';

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  downloading: 'Downloading',
  extracting_audio: 'Extracting Audio',
  transcribing: 'Transcribing',
  translating: 'Translating',
  voicegen: 'Voice Gen',
  rendering: 'Rendering',
  uploading_yt: 'Uploading YT',
  done: 'Done',
  error: 'Error',
};

const STATUS_BADGE: Record<JobStatus, string> = {
  pending:         'bg-tertiary text-secondary-text',
  downloading:     'bg-accent-light text-accent',
  extracting_audio:'bg-accent-light text-accent',
  transcribing:    'bg-purple-light text-purple',
  translating:     'bg-warning-light text-warning',
  voicegen:        'bg-purple-light text-purple',
  rendering:       'bg-warning-light text-warning',
  uploading_yt:    'bg-accent-light text-accent',
  done:            'bg-success-light text-success',
  error:           'bg-danger-light text-danger',
};

const btnBase =
  'inline-flex items-center justify-center border-none rounded-lg cursor-pointer text-sm font-semibold px-[18px] py-[9px] whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed';

export function JobsView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data: Job[] = await api.getJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  async function handleDeleteJob(id: string) {
    await api.deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-secondary-text text-[13px]">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <p className="bg-danger-light border border-danger/30 rounded-lg text-danger px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {!loading && jobs.length === 0 && !error && (
        <div className="py-16 text-center text-secondary-text">
          <p>No jobs yet. Go to the Channel tab to select and process videos.</p>
        </div>
      )}

      {/* Job list */}
      <div className="flex flex-col gap-3">
        {jobs.map(job => (
          <div
            key={job.id}
            className={`bg-secondary rounded-xl px-5 py-4 flex flex-col gap-2.5 border transition-colors ${
              job.status === 'error' ? 'border-danger/35' : 'border-border'
            }`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-primary-text overflow-hidden text-ellipsis whitespace-nowrap"
                  title={job.videoTitle}
                >
                  {job.videoTitle}
                </p>
                {job.videoTitleId && job.videoTitleId !== job.videoTitle && (
                  <p className="text-[12px] text-secondary-text truncate" title={job.videoTitleId}>
                    → {job.videoTitleId}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`inline-flex items-center text-[11px] font-bold tracking-[0.4px] uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[job.status]}`}
                >
                  {STATUS_LABELS[job.status]}
                </span>
                <button
                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-danger/10 text-danger hover:bg-danger hover:text-white text-xs font-bold transition-colors cursor-pointer border-none"
                  onClick={() => handleDeleteJob(job.id)}
                  title="Delete job"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  job.status === 'done'
                    ? 'bg-success'
                    : job.status === 'error'
                    ? 'bg-danger'
                    : 'bg-accent animate-pulse'
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-secondary-text">{job.progress}%</span>
              <span className="text-[13px] text-secondary-text">Created {formatDate(job.createdAt)}</span>
            </div>

            {job.status === 'done' && job.outputFileName && (
              <p className="text-[12px] text-success bg-success-light rounded px-2.5 py-1.5 truncate">
                ✓ {job.outputFileName}
              </p>
            )}

            {job.status === 'error' && job.error && (
              <p className="text-[12px] text-danger bg-danger-light rounded px-2.5 py-1.5">
                {job.error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
