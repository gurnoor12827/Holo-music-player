import type { CSSProperties } from 'react';
import type { RepeatMode, TrackRecord } from '../types/music';
import { formatTime } from '../utils/audioMetadata';
import {
  HoloCollapseIcon,
  HoloEqualizerIcon,
  HoloImageEditIcon,
  HoloNextIcon,
  HoloPauseIcon,
  HoloPlayIcon,
  HoloPrevIcon,
  HoloRepeatIcon,
  HoloShuffleIcon,
  HoloVinylIcon,
} from './HoloIcons';

interface NowPlayingViewProps {
  isOpen: boolean;
  track: TrackRecord | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isArtworkBroken: boolean;
  queuePositionLabel: string | null;
  onCollapse: () => void;
  onTogglePlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenArtworkEditor: (track: TrackRecord) => void;
  onMarkArtworkBroken: (trackId: string) => void;
  onOpenEqualizer: () => void;
}

export function NowPlayingView({
  isOpen,
  track,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeat,
  isArtworkBroken,
  queuePositionLabel,
  onCollapse,
  onTogglePlayPause,
  onPrevious,
  onNext,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onOpenArtworkEditor,
  onMarkArtworkBroken,
  onOpenEqualizer,
}: NowPlayingViewProps) {
  if (!isOpen) return null;

  const effectiveDuration = duration > 0 ? duration : track?.durationSec || 0;
  const seekMax = effectiveDuration > 0 ? effectiveDuration : 1;
  const seekPct = seekMax > 0 ? Math.min(100, (currentTime / seekMax) * 100) : 0;
  const hasValidArt = Boolean(track?.artworkDataUrl) && !isArtworkBroken;

  return (
    <section
      aria-label="Now Playing"
      className="holo-bg-gradient fixed inset-0 z-40 flex flex-col overflow-hidden"
    >
      {/* Top Bar */}
      <header className="holo-actionbar-surface flex h-13 shrink-0 items-center justify-between px-2 sm:px-4">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse Now Playing"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
        >
          <HoloCollapseIcon className="h-6 w-6" />
        </button>

        <div className="min-w-0 text-center">
          <h2 className="truncate text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            Now Playing
          </h2>
          {queuePositionLabel && (
            <div className="font-mono text-[11px] tabular-nums text-[var(--text-dim)]">
              {queuePositionLabel}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenEqualizer}
            aria-label="Open Equalizer"
            title="Equalizer"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <HoloEqualizerIcon className="h-5 w-5" />
          </button>
          {track && (
            <button
              type="button"
              onClick={() => onOpenArtworkEditor(track)}
              aria-label="Edit Album Art"
              title="Edit Album Art"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              <HoloImageEditIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="holo-scroll flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-5">
        <div className="flex w-full max-w-md flex-col items-center">
          {/* Large Album Art Container */}
          <button
            type="button"
            disabled={!track}
            onClick={() => {
              if (track) onOpenArtworkEditor(track);
            }}
            aria-label={track ? `Edit cover art for ${track.title}` : 'No album art'}
            className="theme-artwork-box group relative flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden sm:max-w-[336px] disabled:cursor-default"
          >
            {hasValidArt && track?.artworkDataUrl ? (
              <img
                src={track.artworkDataUrl}
                alt={`${track.album} cover`}
                onError={() => onMarkArtworkBroken(track.id)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[var(--accent)]">
                <HoloVinylIcon className="h-28 w-28" />
              </div>
            )}
          </button>

          {/* Track Metadata */}
          <div className="mt-6 w-full text-center">
            <div className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {track ? track.title : 'No track selected'}
            </div>
            <div className="mt-1 truncate text-sm text-[var(--accent)]">
              {track
                ? `${track.artist} · ${track.album}`
                : 'Select a track from your library'}
            </div>
          </div>

          {/* Interactive Seekbar with Tabular Timestamps */}
          <div className="mt-6 w-full">
            <input
              type="range"
              aria-label="Now Playing Seekbar"
              min={0}
              max={seekMax}
              step={0.5}
              disabled={!track}
              value={Math.min(currentTime, seekMax)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="holo-seekbar disabled:opacity-40"
              style={
                {
                  '--seek-pct': `${seekPct}%`,
                  '--seek-color': 'var(--accent)',
                } as CSSProperties
              }
            />
            <div className="mt-0.5 flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-[var(--accent)]">{formatTime(currentTime)}</span>
              <span className="text-[var(--text-secondary)]">
                {formatTime(effectiveDuration)}
              </span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="mt-6 flex w-full items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Toggle Shuffle"
              aria-pressed={shuffle}
              title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
              onClick={onToggleShuffle}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center border ${
                shuffle
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
              style={{ borderRadius: 'var(--control-radius)' }}
            >
              <HoloShuffleIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Previous Track"
              onClick={onPrevious}
              className="holo-btn flex h-12 w-16 items-center justify-center"
            >
              <HoloPrevIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={onTogglePlayPause}
              className="holo-btn-primary flex h-14 w-20 items-center justify-center"
            >
              {isPlaying ? (
                <HoloPauseIcon className="h-7 w-7" />
              ) : (
                <HoloPlayIcon className="h-7 w-7" />
              )}
            </button>

            <button
              type="button"
              aria-label="Next Track"
              onClick={onNext}
              className="holo-btn flex h-12 w-16 items-center justify-center"
            >
              <HoloNextIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              aria-label="Cycle Repeat Mode"
              title={`Repeat: ${repeat}`}
              onClick={onCycleRepeat}
              className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center border ${
                repeat !== 'off'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
              style={{ borderRadius: 'var(--control-radius)' }}
            >
              <HoloRepeatIcon className="h-5 w-5" />
              {repeat === 'one' && (
                <span className="absolute bottom-1 right-1 text-[9px] font-bold leading-none text-[var(--accent)]">
                  1
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
