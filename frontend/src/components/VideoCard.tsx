import type { VideoMetadata } from '../types';
import { formatViews, formatDuration } from '../utils';

interface VideoCardProps {
  video: VideoMetadata;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function VideoCard({ video, selected, onToggle }: VideoCardProps) {
  return (
    <div
      className={`video-card${selected ? ' video-card--selected' : ''}`}
      onClick={() => onToggle(video.id)}
    >
      <div className="video-card__checkbox-wrap">
        <input
          type="checkbox"
          className="video-card__checkbox"
          checked={selected}
          onChange={() => onToggle(video.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select "${video.title}"`}
        />
      </div>

      <div className="video-card__thumb-wrap">
        <img
          className="video-card__thumb"
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
        />
        <span className="video-card__duration">{formatDuration(video.duration)}</span>
      </div>

      <div className="video-card__info">
        <p className="video-card__title" title={video.title}>
          {video.title}
        </p>
        <span className="video-card__views">{formatViews(video.viewCount)}</span>
      </div>
    </div>
  );
}
