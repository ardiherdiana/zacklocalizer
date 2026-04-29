import { useState, useEffect } from 'react';
import type { VideoMetadata, PaginatedVideos } from '../types';
import { api } from '../api';
import { VideoCard } from './VideoCard';

interface ChannelViewProps {
  onJobsCreated: () => void;
}

export function ChannelView({ onJobsCreated }: ChannelViewProps) {
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paginatedData, setPaginatedData] = useState<PaginatedVideos | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('zl_channel_cache');
      if (cached) {
        const { url, data, page, size } = JSON.parse(cached);
        setChannelUrl(url ?? '');
        setPaginatedData(data ?? null);
        setCurrentPage(page ?? 1);
        setPageSize(size ?? 25);
      }
    } catch {
      localStorage.removeItem('zl_channel_cache');
    }
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const videos: VideoMetadata[] = paginatedData?.videos ?? [];
  const totalPages: number = paginatedData?.totalPages ?? 1;

  async function fetchVideos(page: number, size: number) {
    if (!channelUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data: PaginatedVideos = await api.fetchVideos(channelUrl.trim(), page, size);
      setPaginatedData(data);
      setSelectedIds(new Set());
      localStorage.setItem('zl_channel_cache', JSON.stringify({
        url: channelUrl.trim(),
        data,
        page,
        size,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos.');
    } finally {
      setLoading(false);
    }
  }

  function handleFetch() {
    setCurrentPage(1);
    fetchVideos(1, pageSize);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    fetchVideos(newPage, pageSize);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchVideos(1, newSize);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAll() {
    const allSelected = videos.every(v => selectedIds.has(v.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map(v => v.id)));
    }
  }

  const allSelected = videos.length > 0 && videos.every(v => selectedIds.has(v.id));

  async function handleProcess() {
    const selected = videos.filter(v => selectedIds.has(v.id));
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await api.createJobs(selected);
      setSelectedIds(new Set());
      onJobsCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create jobs.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="view">
      {/* Input group */}
      <div className="input-group">
        <input
          className="input"
          type="url"
          placeholder="https://www.youtube.com/@channel"
          value={channelUrl}
          onChange={e => setChannelUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFetch()}
          disabled={loading}
        />
        <button
          className="btn btn--primary"
          onClick={handleFetch}
          disabled={loading || !channelUrl.trim()}
        >
          {loading ? 'Fetching…' : 'Fetch Videos'}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* Loading spinner */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Fetching videos from channel…</p>
        </div>
      )}

      {/* Toolbar */}
      {!loading && paginatedData && (
        <>
          <div className="toolbar">
            <div className="toolbar__left">
              <span className="muted">
                {paginatedData.total} videos total — Page {currentPage} of {totalPages}
              </span>
              <button className="btn btn--secondary" onClick={handleSelectAll}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="toolbar__right">
              <label className="muted" htmlFor="page-size-select">Per page:</label>
              <select
                id="page-size-select"
                className="select"
                value={pageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                className="btn btn--primary"
                onClick={handleProcess}
                disabled={selectedIds.size === 0 || submitting}
              >
                {submitting ? 'Creating…' : `Process Selected (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {/* Video grid */}
          <div className="video-grid">
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                selected={selectedIds.has(video.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              className="btn btn--secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              ← Previous
            </button>
            <span className="pagination__label">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn--secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
