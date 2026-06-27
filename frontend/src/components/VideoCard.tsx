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
      className={`bg-secondary border-2 rounded-xl overflow-hidden cursor-pointer relative transition-all duration-150 select-none group hover:-translate-y-0.5 ${
        selected ? 'border-accent shadow-sm shadow-accent/20' : 'border-border hover:border-[#cbd5e1]'
      }`}
      onClick={() => onToggle(video.id)}
    >
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          className="w-[18px] h-[18px] accent-accent cursor-pointer"
          checked={selected}
          onChange={() => onToggle(video.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select "${video.title}"`}
        />
      </div>

      <div className="relative aspect-video overflow-hidden bg-tertiary">
        <img
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
        />
        <span className="absolute bottom-1.5 right-2 bg-black/75 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-sm tracking-[0.3px]">
          {formatDuration(video.duration)}
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1">
        <p
          className="text-[13px] font-semibold text-primary-text overflow-hidden line-clamp-2 leading-snug"
          title={video.title}
        >
          {video.title}
        </p>
        <span className="text-[12px] text-secondary-text">{formatViews(video.viewCount)}</span>
      </div>
    </div>
  );
}
