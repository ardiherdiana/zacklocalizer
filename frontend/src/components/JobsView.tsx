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
  done: 'Done',
  error: 'Error',
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  pending: 'badge--pending',
  downloading: 'badge--downloading',
  extracting_audio: 'badge--extracting',
  transcribing: 'badge--transcribing',
  translating: 'badge--translating',
  voicegen: 'badge--voicegen',
  rendering: 'badge--rendering',
  done: 'badge--done',
  error: 'badge--error',
};

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

  function handleRefresh() {
    setLoading(true);
    fetchJobs();
  }

  async function handleDeleteJob(id: string) {
    await api.deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  async function handleDeleteAll() {
    if (!confirm('Hapus semua jobs?')) return;
    await api.deleteAllJobs();
    setJobs([]);
  }

  function handleDownloadAll() {
    const doneJobs = jobs.filter(j => j.status === 'done' && j.outputPath);
    doneJobs.forEach(job => {
      window.open(`http://localhost:3001/downloads/final/${encodeURIComponent(job.outputFileName!)}`, '_blank');
    });
  }

  const doneCount = jobs.filter(j => j.status === 'done').length;

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar__left">
          <span className="muted">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="toolbar__right">
          {doneCount > 0 && (
            <button className="btn btn--primary" onClick={handleDownloadAll}>
              Download All ({doneCount})
            </button>
          )}
          {jobs.length > 0 && (
            <button className="btn btn--danger" onClick={handleDeleteAll}>
              Delete All
            </button>
          )}
          <button className="btn btn--secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {!loading && jobs.length === 0 && !error && (
        <div className="empty-state">
          <p>No jobs yet. Go to the Channel tab to select and process videos.</p>
        </div>
      )}

      <div className="jobs-list">
        {jobs.map(job => (
          <div key={job.id} className={`job-card${job.status === 'error' ? ' job-card--error' : ''}`}>
            <div className="job-card__header">
              <span className="job-card__title" title={job.videoTitle}>
                {job.videoTitle}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge ${STATUS_CLASSES[job.status]}`}>
                  {STATUS_LABELS[job.status]}
                </span>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDeleteJob(job.id)}
                  title="Delete job"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div
                className={`progress-bar${job.status === 'done' ? ' progress-bar--done' : ''}${job.status === 'error' ? ' progress-bar--error' : ''}`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="job-card__meta">
              <span className="muted">{job.progress}%</span>
              <span className="muted">Created {formatDate(job.createdAt)}</span>
            </div>

            {job.status === 'done' && job.outputPath && (
              <div className="job-card__download">
                <a
                  className="btn btn--primary"
                  href={`http://localhost:3001/downloads/final/${encodeURIComponent(job.outputFileName!)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
            )}

            {job.status === 'error' && job.error && (
              <p className="job-card__error-msg">{job.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
