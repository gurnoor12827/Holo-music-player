import { memo, useCallback, useEffect, useRef } from 'react';
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
      data-index={index}
      data-track-index={index}
      data-id={track.id}
      data-track-id={track.id}
      aria-label={`Play ${track.title} by ${track.artist}`}
      className={`holo-list-row flex min-h-[60px] items-center gap-2 pr-2 focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
        isCurrent ? 'holo-list-row-active' : ''
      }`}
    >
      {/* Active Indicator */}
      <div
        className="pointer-events-none w-1 shrink-0 self-stretch"
        style={
          isCurrent
            ? {
                backgroundColor: 'var(--accent)',
                boxShadow: '0 0 10px var(--accent-glow)',
              }
            : { backgroundColor: 'transparent' }
        }
      />

      {/* Track Metadata & Cover Area */}
      <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        {showListArtwork && (
          <div
            className={`theme-artwork-box relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden ${
              !hasValidArt ? 'theme-artwork-fallback' : ''
            }`}
          >
            {hasValidArt && track.artworkDataUrl ? (
              <img
                src={track.artworkDataUrl}
                alt={`${track.album} cover`}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => onMarkArtworkBroken(track.id)}
                className="h-full w-full object-cover"
              />
            ) : (
              <HoloMusicNoteIcon
                className={`h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] ${
                  isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] opacity-85'
                }`}
              />
            )}
            {isCurrent && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
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
      <div className="flex shrink-0 items-center gap-0.5" data-row-action="true">
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
  onLongPressTrack?: (
    tracks: TrackRecord[],
    index: number,
    playlistContextId?: string
  ) => void;
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
  onLongPressTrack,
  onEditArtwork,
  onAddToPlaylist,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
  onMarkArtworkBroken,
}: TrackListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tracksRef = useRef<TrackRecord[]>(tracks);
  tracksRef.current = tracks;

  const longPressTimerRef = useRef<number | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const resolveRowIndex = useCallback((target: EventTarget | null): number => {
    if (!(target instanceof Element)) return -1;
    if (target.closest('[data-row-action="true"]')) return -1;
    const row = target.closest<HTMLElement>('[data-index], [data-track-index]');
    if (!row) return -1;
    const rawIdx = row.dataset.index ?? row.dataset.trackIndex;
    const rawId = row.dataset.id ?? row.dataset.trackId;
    const list = tracksRef.current;
    let idx = rawIdx !== undefined ? Number(rawIdx) : -1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) {
      if (rawId) {
        idx = list.findIndex((t) => t.id === rawId);
      }
    }
    return idx >= 0 && idx < list.length ? idx : -1;
  }, []);

  const playTrack = useCallback(
    (index: number) => {
      const list = tracksRef.current;
      if (index >= 0 && index < list.length) {
        onPlayTrack(list, index);
      }
    },
    [onPlayTrack]
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  }, []);

  useEffect(() => {
    const trackListContainer = containerRef.current;
    if (!trackListContainer) return;

    const handleDelegatedClick = (e: globalThis.MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const index = resolveRowIndex(e.target);
      if (index >= 0) {
        playTrack(index);
      }
    };

    const handlePointerDown = (e: globalThis.PointerEvent) => {
      if (!onLongPressTrack) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const index = resolveRowIndex(e.target);
      if (index < 0) return;

      clearLongPressTimer();
      longPressOriginRef.current = { x: e.clientX, y: e.clientY };
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        suppressNextClickRef.current = true;
        onLongPressTrack(tracksRef.current, index, playlistContextId);
      }, 480);
    };

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      if (!longPressOriginRef.current) return;
      const dx = e.clientX - longPressOriginRef.current.x;
      const dy = e.clientY - longPressOriginRef.current.y;
      if (dx * dx + dy * dy > 64) {
        clearLongPressTimer();
      }
    };

    const handlePointerCancelOrUp = () => {
      clearLongPressTimer();
    };

    const handleContextMenu = (e: globalThis.MouseEvent) => {
      if (!onLongPressTrack) return;
      const index = resolveRowIndex(e.target);
      if (index < 0) return;
      e.preventDefault();
      clearLongPressTimer();
      onLongPressTrack(tracksRef.current, index, playlistContextId);
    };

    trackListContainer.addEventListener('click', handleDelegatedClick);
    trackListContainer.addEventListener('pointerdown', handlePointerDown);
    trackListContainer.addEventListener('pointermove', handlePointerMove);
    trackListContainer.addEventListener('pointerup', handlePointerCancelOrUp);
    trackListContainer.addEventListener('pointercancel', handlePointerCancelOrUp);
    trackListContainer.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearLongPressTimer();
      trackListContainer.removeEventListener('click', handleDelegatedClick);
      trackListContainer.removeEventListener('pointerdown', handlePointerDown);
      trackListContainer.removeEventListener('pointermove', handlePointerMove);
      trackListContainer.removeEventListener('pointerup', handlePointerCancelOrUp);
      trackListContainer.removeEventListener('pointercancel', handlePointerCancelOrUp);
      trackListContainer.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    clearLongPressTimer,
    onLongPressTrack,
    playTrack,
    playlistContextId,
    resolveRowIndex,
  ]);

  return (
    <div
      ref={containerRef}
      className="holo-track-list"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const index = resolveRowIndex(e.target);
          if (index >= 0) {
            e.preventDefault();
            playTrack(index);
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
