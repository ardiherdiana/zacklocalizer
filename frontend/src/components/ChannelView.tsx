import { useState, useEffect } from 'react';
import type { VideoMetadata, PaginatedVideos } from '../types';
import { api } from '../api';
import { VideoCard } from './VideoCard';

interface ChannelViewProps {
  onJobsCreated: () => void;
}

const btnBase =
  'inline-flex items-center justify-center border-none rounded-lg cursor-pointer text-sm font-semibold px-[18px] py-[9px] whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed';
const btnPrimary = `${btnBase} bg-accent text-white hover:bg-[#2563eb]`;
const btnSecondary = `${btnBase} bg-secondary text-primary-text border border-border hover:bg-tertiary`;

const CHANNEL_URL = 'https://www.youtube.com/@zackdfilms/shorts';

export function ChannelView({ onJobsCreated }: ChannelViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginatedData, setPaginatedData] = useState<PaginatedVideos | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [startFrom, setStartFrom] = useState(1);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('zl_channel_cache');
      if (cached) {
        const { data, page, size } = JSON.parse(cached);
        setPaginatedData(data ?? null);
        setCurrentPage(page ?? 1);
        setPageSize(size ?? 25);
      }
    } catch {
      localStorage.removeItem('zl_channel_cache');
    }
  }, []);

  const videos: VideoMetadata[] = paginatedData?.videos ?? [];
  const totalPages: number = paginatedData?.totalPages ?? 1;

  async function fetchVideos(page: number, size: number) {
    setLoading(true);
    setError(null);
    try {
      const data: PaginatedVideos = await api.fetchVideos(CHANNEL_URL, page, size);
      setPaginatedData(data);
      setSelectedIds(new Set());
      localStorage.setItem(
        'zl_channel_cache',
        JSON.stringify({ data, page, size }),
      );
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    const allSelected = videos.every(v => selectedIds.has(v.id));
    setSelectedIds(allSelected ? new Set() : new Set(videos.map(v => v.id)));
  }

  const allSelected = videos.length > 0 && videos.every(v => selectedIds.has(v.id));

  async function handleProcess() {
    const selected = videos.filter(v => selectedIds.has(v.id));
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await api.createJobs(selected, startFrom);
      setSelectedIds(new Set());
      onJobsCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create jobs.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Channel URL (readonly) */}
      <div className="flex gap-2.5">
        <div className="flex-1 bg-tertiary border border-border rounded-lg text-secondary-text text-sm px-3.5 py-2.5 select-none truncate">
          {CHANNEL_URL}
        </div>
        <button
          className={btnPrimary}
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Fetching…' : 'Fetch Videos'}
        </button>
      </div>

      {error && (
        <p className="bg-danger-light border border-danger/30 rounded-lg text-danger px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-secondary-text">
          <div
            className="w-9 h-9 rounded-full border-[3px] border-border border-t-accent animate-spin"
            style={{ animationDuration: '0.75s' }}
          />
          <p>Fetching videos from channel…</p>
        </div>
      )}

      {!loading && paginatedData && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-secondary-text text-[13px]">
                {paginatedData.total} videos — Page {currentPage} of {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <label className="text-secondary-text text-[13px]" htmlFor="page-size-select">
                Per page:
              </label>
              <select
                id="page-size-select"
                className="bg-secondary border border-border rounded-lg text-primary-text text-sm px-2.5 py-2 cursor-pointer outline-none focus:border-accent transition-colors"
                value={pageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-secondary-text text-[13px] whitespace-nowrap" htmlFor="start-from">
                    Mulai dari #
                  </label>
                  <input
                    id="start-from"
                    type="text"
                    inputMode="numeric"
                    value={startFrom}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 1) setStartFrom(n);
                      else if (e.target.value === '') setStartFrom(1);
                    }}
                    className="w-16 bg-secondary border border-border rounded-lg text-primary-text text-sm px-2.5 py-2 outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}
              <button
                className={btnPrimary}
                onClick={handleProcess}
                disabled={selectedIds.size === 0 || submitting}
              >
                {submitting ? 'Creating…' : `Process Selected (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {/* Video grid */}
          <div className="grid gap-4 grid-cols-3 max-[900px]:grid-cols-2 max-[540px]:grid-cols-1">
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                selected={selectedIds.has(video.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>

          {/* FAB Select All */}
          <button
            onClick={handleSelectAll}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-[#2563eb] transition-colors"
          >
            <i className={`fa-solid ${allSelected ? 'fa-square-minus' : 'fa-square-check'}`} />
            {allSelected ? 'Deselect All' : 'Select All'}
            {selectedIds.size > 0 && (
              <span className="bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {selectedIds.size}
              </span>
            )}
          </button>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              className={btnSecondary}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              ← Previous
            </button>
            <span className="text-secondary-text text-[13px] min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={btnSecondary}
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
