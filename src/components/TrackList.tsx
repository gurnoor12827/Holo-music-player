import { memo } from 'react';
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
  tracks: TrackRecord[];
  playlistContextId?: string;
  isCurrent: boolean;
  isPlaying: boolean;
  showListArtwork: boolean;
  isArtBroken: boolean;
  onPlayTrack: (tracks: TrackRecord[], index: number) => void;
  onEditArtwork: (track: TrackRecord, isCorrupted: boolean) => void;
  onAddToPlaylist: (track: TrackRecord) => void;
  onRemoveFromLibrary: (trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onMarkArtworkBroken: (trackId: string) => void;
}

const TrackRow = memo(function TrackRow({
  track,
  index,
  tracks,
  playlistContextId,
  isCurrent,
  isPlaying,
  showListArtwork,
  isArtBroken,
  onPlayTrack,
  onEditArtwork,
  onAddToPlaylist,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
  onMarkArtworkBroken,
}: TrackRowProps) {
  const hasValidArt = Boolean(track.artworkDataUrl) && !isArtBroken;

  return (
    <div
      className={`holo-list-row flex min-h-[60px] items-center gap-2 pr-2 ${
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

      {/* Main Row Click Target */}
      <button
        type="button"
        onClick={() => onPlayTrack(tracks, index)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
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
      </button>

      {/* Row Quick Actions */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          title={hasValidArt ? 'Edit Album Art' : 'Set Album Art'}
          aria-label={`Edit album art for ${track.title}`}
          onClick={() => onEditArtwork(track, !hasValidArt)}
          className={`flex min-h-[40px] min-w-[40px] items-center justify-center hover:text-[var(--accent)] ${
            !hasValidArt ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
          }`}
        >
          <HoloImageEditIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          title="Add to Playlist"
          aria-label={`Add ${track.title} to playlist`}
          onClick={() => onAddToPlaylist(track)}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)]"
        >
          <HoloPlaylistAddIcon className="h-4 w-4" />
        </button>

        {playlistContextId ? (
          <button
            type="button"
            title="Remove from Playlist"
            aria-label={`Remove ${track.title} from playlist`}
            onClick={() => onRemoveFromPlaylist(playlistContextId, track.id)}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
          >
            <HoloCloseIcon className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            title="Remove Track"
            aria-label={`Remove ${track.title} from library`}
            onClick={() => onRemoveFromLibrary(track.id)}
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
  return (
    <div className="holo-track-list">
      {tracks.map((track, idx) => (
        <TrackRow
          key={playlistContextId ? `${playlistContextId}-${track.id}-${idx}` : track.id}
          track={track}
          index={idx}
          tracks={tracks}
          playlistContextId={playlistContextId}
          isCurrent={currentTrackId === track.id}
          isPlaying={isPlaying}
          showListArtwork={showListArtwork}
          isArtBroken={brokenArtIds.has(track.id)}
          onPlayTrack={onPlayTrack}
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
