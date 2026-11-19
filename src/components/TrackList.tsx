import { memo, useCallback, useRef, type MouseEvent, type TouchEvent } from 'react';
import type { TrackRecord } from '../types/music';
import { formatTime } from '../utils/audioMetadata';
import {
  HoloCloseIcon,
  HoloImageEditIcon,
  HoloMusicNoteIcon,
  HoloPauseIcon,
  HoloPlayIcon,
  HoloPlaylistAddIcon,
  HoloTrashIcon,
} from './HoloIcons';

interface TrackRowProps {
  track: TrackRecord;
  index: number;
  playlistContextId?: string;
  isCurrent: boolean;
  isPlaying: boolean;
  showListArtwork: boolean;
  isArtBroken: boolean;
  onEditArtwork: (track: TrackRecord, isCorrupted: boolean) => void;
  onAddToPlaylist: (track: TrackRecord) => void;
  onRemoveFromLibrary: (trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onMarkArtworkBroken: (trackId: string) => void;
}

const TrackRow = memo(function TrackRow({
  track,
  index,
  playlistContextId,
  isCurrent,
  isPlaying,
  showListArtwork,
  isArtBroken,
  onEditArtwork,
  onAddToPlaylist,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
  onMarkArtworkBroken,
}: TrackRowProps) {
  const hasValidArt = Boolean(track.artworkDataUrl) && !isArtBroken;

  return (
    <div
      role="button"
      tabIndex={0}
      data-id={track.id}
      data-track-id={track.id}
      data-track-index={index}
      aria-label={`Play ${track.title} by ${track.artist}`}
      className={`holo-list-row flex min-h-[60px] items-center gap-2 pr-2 focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
        isCurrent ? 'holo-list-row-active' : ''
      }`}
    >
      {/* Active Indicator */}
      <div
        className="w-1 shrink-0 self-stretch"
        style={
          isCurrent
            ? {
                backgroundColor: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent-glow)',
              }
            : { backgroundColor: 'transparent' }
        }
      />

      {/* Track Metadata & Cover Area */}
      <div className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        {showListArtwork && (
          <div className="theme-artwork-box relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
            {hasValidArt && track.artworkDataUrl ? (
              <img
                src={track.artworkDataUrl}
                alt={`${track.album} cover`}
                decoding="async"
                onError={() => onMarkArtworkBroken(track.id)}
                className="h-full w-full object-cover"
              />
            ) : (
              <HoloMusicNoteIcon
                className={`h-5 w-5 ${
                  isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
                }`}
              />
            )}
            {isCurrent && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                {isPlaying ? (
                  <HoloPlayIcon className="h-5 w-5 text-[var(--accent)]" />
                ) : (
                  <HoloPauseIcon className="h-5 w-5 text-[var(--accent)]" />
                )}
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-sm font-medium ${
              isCurrent ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {track.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {track.artist}
            {track.album ? ` · ${track.album}` : ''}
          </div>
        </div>

        <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-dim)]">
          {formatTime(track.durationSec)}
        </span>
      </div>

      {/* Row Quick Actions */}
      <div className="flex shrink-0 items-center" data-row-action="true">
        <button
          type="button"
          data-row-action="true"
          title={hasValidArt ? 'Edit Album Art' : 'Set Album Art'}
          aria-label={`Edit album art for ${track.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onEditArtwork(track, !hasValidArt);
          }}
          className={`flex min-h-[40px] min-w-[40px] items-center justify-center hover:text-[var(--accent)] ${
            !hasValidArt ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
          }`}
        >
          <HoloImageEditIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          data-row-action="true"
          title="Add to Playlist"
          aria-label={`Add ${track.title} to playlist`}
          onClick={(e) => {
            e.stopPropagation();
            onAddToPlaylist(track);
          }}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)]"
        >
          <HoloPlaylistAddIcon className="h-4 w-4" />
        </button>

        {playlistContextId ? (
          <button
            type="button"
            data-row-action="true"
            title="Remove from Playlist"
            aria-label={`Remove ${track.title} from playlist`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromPlaylist(playlistContextId, track.id);
            }}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
          >
            <HoloCloseIcon className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            data-row-action="true"
            title="Remove Track"
            aria-label={`Remove ${track.title} from library`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromLibrary(track.id);
            }}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
          >
            <HoloTrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});

interface TrackListProps {
  tracks: TrackRecord[];
  playlistContextId?: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  showListArtwork: boolean;
  brokenArtIds: Set<string>;
  onPlayTrack: (tracks: TrackRecord[], index: number) => void;
  onEditArtwork: (track: TrackRecord, isCorrupted: boolean) => void;
  onAddToPlaylist: (track: TrackRecord) => void;
  onRemoveFromLibrary: (trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onMarkArtworkBroken: (trackId: string) => void;
}

export const TrackList = memo(function TrackList({
  tracks,
  playlistContextId,
  currentTrackId,
  isPlaying,
  showListArtwork,
  brokenArtIds,
  onPlayTrack,
  onEditArtwork,
  onAddToPlaylist,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
  onMarkArtworkBroken,
}: TrackListProps) {
  const tracksRef = useRef<TrackRecord[]>(tracks);
  tracksRef.current = tracks;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchHandledAtRef = useRef<number>(0);

  const playFromTarget = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      if (target.closest('[data-row-action="true"]')) return;
      const row = target.closest<HTMLElement>('[data-track-index]');
      if (!row) return;
      const rawIdx = row.dataset.trackIndex;
      const rawId = row.dataset.id;
      const list = tracksRef.current;
      let idx = rawIdx !== undefined ? Number(rawIdx) : -1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) {
        if (rawId) {
          idx = list.findIndex((t) => t.id === rawId);
        }
      }
      if (idx >= 0 && idx < list.length) {
        onPlayTrack(list, idx);
      }
    },
    [onPlayTrack]
  );

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const target = e.target;
    if (target instanceof Element && target.closest('[data-row-action="true"]')) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || e.changedTouches.length !== 1) return;
      const dx = Math.abs(e.changedTouches[0].clientX - start.x);
      const dy = Math.abs(e.changedTouches[0].clientY - start.y);
      if (dx < 8 && dy < 8) {
        lastTouchHandledAtRef.current = performance.now();
        playFromTarget(e.target);
      }
    },
    [playFromTarget]
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (performance.now() - lastTouchHandledAtRef.current < 450) {
        return;
      }
      playFromTarget(e.target);
    },
    [playFromTarget]
  );

  return (
    <div
      className="holo-track-list"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target;
          if (target instanceof Element && !target.closest('[data-row-action="true"]')) {
            e.preventDefault();
            playFromTarget(target);
          }
        }
      }}
    >
      {tracks.map((track, idx) => (
        <TrackRow
          key={playlistContextId ? `${playlistContextId}-${track.id}-${idx}` : track.id}
          track={track}
          index={idx}
          playlistContextId={playlistContextId}
          isCurrent={currentTrackId === track.id}
          isPlaying={isPlaying}
          showListArtwork={showListArtwork}
          isArtBroken={brokenArtIds.has(track.id)}
          onEditArtwork={onEditArtwork}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveFromLibrary={onRemoveFromLibrary}
          onRemoveFromPlaylist={onRemoveFromPlaylist}
          onMarkArtworkBroken={onMarkArtworkBroken}
        />
      ))}
    </div>
  );
});
