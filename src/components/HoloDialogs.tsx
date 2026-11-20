import { useEffect, useState } from 'react';
import type { PlaylistRecord, SortMode, TrackRecord } from '../types/music';
import {
  formatFileSize,
  formatTime,
  probeTrackTechMetadata,
} from '../utils/audioMetadata';
import {
  HoloCloseIcon,
  HoloImageEditIcon,
  HoloMusicNoteIcon,
  HoloPlayIcon,
  HoloPlaylistAddIcon,
  HoloTrashIcon,
  HoloVinylIcon,
} from './HoloIcons';

interface SortDialogProps {
  isOpen: boolean;
  currentSort: SortMode;
  onSelect: (mode: SortMode) => void;
  onClose: () => void;
}

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'title', label: 'Title (A - Z)' },
  { mode: 'artist', label: 'Artist (A - Z)' },
  { mode: 'album', label: 'Album (A - Z)' },
  { mode: 'duration', label: 'Duration (Longest first)' },
  { mode: 'added', label: 'Recently Added' },
];

export function HoloSortDialog({ isOpen, currentSort, onSelect, onClose }: SortDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sort Tracks By"
    >
      <div
        className="holo-dialog-surface w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="text-base font-semibold text-[var(--accent)]">Sort Tracks By</h2>
        </div>

        <div className="divide-y divide-[var(--divider)]">
          {SORT_OPTIONS.map((opt) => {
            const selected = opt.mode === currentSort;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  onSelect(opt.mode);
                  onClose();
                }}
                className="flex min-h-[46px] w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-[var(--surface-row-hover)]"
              >
                <span
                  className={
                    selected
                      ? 'font-semibold text-[var(--accent)]'
                      : 'text-[var(--text-primary)]'
                  }
                >
                  {opt.label}
                </span>
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full border"
                  style={{
                    borderColor: selected ? 'var(--accent)' : 'var(--divider-strong)',
                  }}
                >
                  {selected && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: 'var(--accent)',
                        boxShadow: '0 0 6px var(--accent-glow)',
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn min-h-[44px] w-full border-0 py-3 text-center text-sm font-medium"
            style={{ borderRadius: 0 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  initialName?: string;
  heading?: string;
  confirmLabel?: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export function HoloCreatePlaylistDialog({
  isOpen,
  initialName = '',
  heading = 'New Playlist',
  confirmLabel = 'Create',
  onConfirm,
  onClose,
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState(initialName);

  if (!isOpen) return null;

  const trimmed = name.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <form
        className="holo-dialog-surface w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onConfirm(trimmed);
          setName('');
          onClose();
        }}
      >
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="text-base font-semibold text-[var(--accent)]">{heading}</h2>
        </div>

        <div className="px-5 py-5">
          <label
            htmlFor="playlist-name-input"
            className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Playlist Name
          </label>
          <input
            id="playlist-name-input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist title..."
            className="w-full border-b-2 border-[var(--accent)] bg-transparent py-2 text-base text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn min-h-[44px] border-0 border-r border-[var(--divider)] py-3 text-sm font-medium"
            style={{ borderRadius: 0 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="holo-btn-primary min-h-[44px] border-0 py-3 text-sm font-semibold disabled:opacity-40"
            style={{ borderRadius: 0 }}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

interface AddToPlaylistDialogProps {
  track: TrackRecord | null;
  playlists: PlaylistRecord[];
  onToggleTrackInPlaylist: (playlistId: string, trackId: string) => void;
  onCreateAndAdd: (playlistName: string, trackId: string) => void;
  onClose: () => void;
}

export function HoloAddToPlaylistDialog({
  track,
  playlists,
  onToggleTrackInPlaylist,
  onCreateAndAdd,
  onClose,
}: AddToPlaylistDialogProps) {
  const [newName, setNewName] = useState('');

  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add to Playlist"
    >
      <div
        className="holo-dialog-surface flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="text-base font-semibold text-[var(--accent)]">Add to Playlist</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{track.title}</p>
        </div>

        <div className="holo-scroll flex-1 divide-y divide-[var(--divider)] overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="px-5 py-5 text-xs text-[var(--text-secondary)]">
              No playlists created yet. Enter a name below to create one.
            </div>
          ) : (
            playlists.map((pl) => {
              const contains = pl.trackIds.includes(track.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => onToggleTrackInPlaylist(pl.id, track.id)}
                  className="flex min-h-[48px] w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-[var(--surface-row-hover)]"
                >
                  <div className="min-w-0 pr-3">
                    <div className="truncate font-medium text-[var(--text-primary)]">{pl.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {pl.trackIds.length} {pl.trackIds.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-bold"
                    style={
                      contains
                        ? {
                            borderColor: 'var(--accent)',
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent)',
                          }
                        : {
                            borderColor: 'var(--divider-strong)',
                            color: 'transparent',
                          }
                    }
                  >
                    ✓
                  </span>
                </button>
              );
            })
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-[var(--divider)] px-4 py-3"
          style={{ backgroundColor: 'var(--surface-well)' }}
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = newName.trim();
            if (!trimmed) return;
            onCreateAndAdd(trimmed, track.id);
            setNewName('');
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist name..."
            className="min-w-0 flex-1 border-b border-[var(--divider-strong)] bg-transparent py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="holo-btn-primary min-h-[38px] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Create
          </button>
        </form>

        <div className="border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn min-h-[44px] w-full border-0 py-3 text-sm font-medium"
            style={{ borderRadius: 0 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlaylistPickerDialogProps {
  playlist: PlaylistRecord | null;
  allTracks: TrackRecord[];
  onToggleTrack: (playlistId: string, trackId: string) => void;
  onClose: () => void;
}

export function HoloPlaylistPickerDialog({
  playlist,
  allTracks,
  onToggleTrack,
  onClose,
}: PlaylistPickerDialogProps) {
  const [filter, setFilter] = useState('');

  if (!playlist) return null;

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      )
    : allTracks;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Manage tracks in ${playlist.name}`}
    >
      <div
        className="holo-dialog-surface flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="text-base font-semibold text-[var(--accent)]">
            Manage Tracks: {playlist.name}
          </h2>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter library tracks..."
            className="mt-2 w-full border-b border-[var(--divider-strong)] bg-transparent py-1 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="holo-scroll flex-1 divide-y divide-[var(--divider)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-[var(--text-secondary)]">
              No tracks match your filter.
            </div>
          ) : (
            filtered.map((t) => {
              const selected = playlist.trackIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onToggleTrack(playlist.id, t.id)}
                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--surface-row-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {t.title}
                    </div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">
                      {t.artist} · {formatTime(t.durationSec)}
                    </div>
                  </div>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-bold"
                    style={
                      selected
                        ? {
                            borderColor: 'var(--accent)',
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent)',
                          }
                        : {
                            borderColor: 'var(--divider-strong)',
                            color: 'transparent',
                          }
                    }
                  >
                    ✓
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn-primary min-h-[44px] w-full border-0 py-3 text-sm font-semibold"
            style={{ borderRadius: 0 }}
          >
            Done ({playlist.trackIds.length} selected)
          </button>
        </div>
      </div>
    </div>
  );
}

interface TrackMetadataDialogProps {
  track: TrackRecord | null;
  isArtworkBroken?: boolean;
  onEditArtwork: (track: TrackRecord) => void;
  onClose: () => void;
}

export function HoloTrackMetadataDialog({
  track,
  isArtworkBroken = false,
  onEditArtwork,
  onClose,
}: TrackMetadataDialogProps) {
  const [probed, setProbed] = useState<{
    audioFormat?: string;
    bitrateKbps?: number;
    sampleRateHz?: number;
    channels?: number;
    filePath?: string;
  } | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!track) {
      setProbed(null);
      return;
    }
    let cancelled = false;
    setProbed({
      audioFormat: track.audioFormat,
      bitrateKbps: track.bitrateKbps,
      sampleRateHz: track.sampleRateHz,
      channels: track.channels,
      filePath: track.filePath,
    });

    if (
      !track.bitrateKbps ||
      !track.sampleRateHz ||
      !track.audioFormat ||
      !track.filePath
    ) {
      setProbing(true);
      void probeTrackTechMetadata(track).then((tech) => {
        if (!cancelled) {
          setProbed(tech);
          setProbing(false);
        }
      });
    } else {
      setProbing(false);
    }

    return () => {
      cancelled = true;
    };
  }, [track]);

  if (!track) return null;

  const hasValidArt = Boolean(track.artworkDataUrl) && !isArtworkBroken;
  const channelsLabel =
    probed?.channels === 1
      ? 'Mono (1 ch)'
      : probed?.channels === 2
      ? 'Stereo (2 ch)'
      : probed?.channels
      ? `${probed.channels} channels`
      : 'Stereo / Auto';

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Title', value: track.title },
    { label: 'Artist', value: track.artist },
    { label: 'Album', value: track.album || 'Local Library' },
    {
      label: 'Format',
      value: probed?.audioFormat || track.mimeType || 'Audio Stream',
    },
    {
      label: 'Bitrate',
      value: probed?.bitrateKbps
        ? `${probed.bitrateKbps} kbps`
        : probing
        ? 'Inspecting...'
        : 'Variable / Container',
      mono: true,
    },
    {
      label: 'Sample Rate',
      value: probed?.sampleRateHz
        ? `${probed.sampleRateHz.toLocaleString()} Hz (${(
            probed.sampleRateHz / 1000
          ).toFixed(1)} kHz)`
        : probing
        ? 'Inspecting...'
        : 'Native Device Rate',
      mono: true,
    },
    { label: 'Channels', value: channelsLabel },
    { label: 'Duration', value: formatTime(track.durationSec), mono: true },
    { label: 'File Size', value: formatFileSize(track.fileSize), mono: true },
    { label: 'File Path', value: probed?.filePath || track.fileName, mono: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ID3 Track Metadata Inspector"
    >
      <div
        className="holo-dialog-surface flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="text-base font-semibold text-[var(--accent)]">
            ID3 Metadata Inspector
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close metadata inspector"
            className="flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <HoloCloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="holo-scroll flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-3.5 border-b border-[var(--divider)] pb-4">
            <div
              className={`theme-artwork-box flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden ${
                hasValidArt ? '' : 'theme-artwork-fallback'
              }`}
            >
              {hasValidArt && track.artworkDataUrl ? (
                <img
                  src={track.artworkDataUrl}
                  alt={`${track.album} cover`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <HoloVinylIcon className="h-9 w-9 text-[var(--accent)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {track.title}
              </div>
              <div className="mt-0.5 truncate text-xs text-[var(--accent)]">
                {track.artist}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                {track.album}
              </div>
            </div>
          </div>

          <dl className="divide-y divide-[var(--divider)]">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  {row.label}
                </dt>
                <dd
                  className={`break-all text-xs text-[var(--text-primary)] sm:text-right ${
                    row.mono ? 'font-mono tabular-nums' : ''
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditArtwork(track);
            }}
            className="holo-btn min-h-[44px] border-0 border-r border-[var(--divider)] py-3 text-sm font-medium text-[var(--accent)]"
            style={{ borderRadius: 0 }}
          >
            Edit Cover Art
          </button>
          <button
            type="button"
            onClick={onClose}
            className="holo-btn-primary min-h-[44px] border-0 py-3 text-sm font-semibold"
            style={{ borderRadius: 0 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface TrackContextMenuProps {
  track: TrackRecord | null;
  playlistContextId?: string;
  onPlayNow: () => void;
  onAddToPlaylist: (track: TrackRecord) => void;
  onInspectMetadata: (track: TrackRecord) => void;
  onEditArtwork: (track: TrackRecord) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function HoloTrackContextMenu({
  track,
  playlistContextId,
  onPlayNow,
  onAddToPlaylist,
  onInspectMetadata,
  onEditArtwork,
  onRemove,
  onClose,
}: TrackContextMenuProps) {
  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Track actions for ${track.title}`}
    >
      <div
        className="holo-dialog-surface w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <h2 className="truncate text-base font-semibold text-[var(--accent)]">
            {track.title}
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {track.artist} · {formatTime(track.durationSec)}
          </p>
        </div>

        <div className="divide-y divide-[var(--divider)]">
          <button
            type="button"
            onClick={() => {
              onPlayNow();
              onClose();
            }}
            className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-row-hover)]"
          >
            <HoloPlayIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Play Track</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onAddToPlaylist(track);
            }}
            className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-row-hover)]"
          >
            <HoloPlaylistAddIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Add to Playlist / New Playlist</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onInspectMetadata(track);
            }}
            className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-row-hover)]"
          >
            <HoloMusicNoteIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Inspect ID3 Metadata</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEditArtwork(track);
            }}
            className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-row-hover)]"
          >
            <HoloImageEditIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Edit Cover Art</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex min-h-[48px] w-full items-center gap-3 px-5 py-3 text-left text-sm text-[var(--danger-text)] hover:bg-[var(--surface-row-hover)]"
          >
            <HoloTrashIcon className="h-4 w-4 shrink-0" />
            <span>
              {playlistContextId ? 'Remove from Playlist' : 'Remove from Library'}
            </span>
          </button>
        </div>

        <div className="border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn min-h-[44px] w-full border-0 py-3 text-center text-sm font-medium"
            style={{ borderRadius: 0 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
