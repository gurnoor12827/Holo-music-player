import { useState } from 'react';
import type { PlaylistRecord, SortMode, TrackRecord } from '../types/music';
import { formatTime } from '../utils/audioMetadata';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sort Tracks By"
    >
      <div
        className="holo-dialog-surface w-full max-w-sm text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-[#33B5E5] px-5 py-3.5">
          <h2 className="text-lg font-medium text-[#33B5E5]">Sort Tracks By</h2>
        </div>

        <div className="divide-y divide-white/10">
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
                className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm hover:bg-[#33B5E5]/15"
              >
                <span className={selected ? 'font-semibold text-[#33B5E5]' : 'text-white/90'}>
                  {opt.label}
                </span>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    selected ? 'border-[#33B5E5]' : 'border-white/40'
                  }`}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-[#33B5E5] shadow-[0_0_6px_#33B5E5]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/15">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn w-full border-0 py-3 text-center text-sm font-medium text-white/85"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <form
        className="holo-dialog-surface w-full max-w-sm text-white"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onConfirm(trimmed);
          setName('');
          onClose();
        }}
      >
        <div className="border-b-2 border-[#33B5E5] px-5 py-3.5">
          <h2 className="text-lg font-medium text-[#33B5E5]">{heading}</h2>
        </div>

        <div className="px-5 py-5">
          <label htmlFor="playlist-name-input" className="mb-2 block text-xs uppercase tracking-wider text-white/65">
            Playlist Name
          </label>
          <input
            id="playlist-name-input"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Late Night Synth"
            className="w-full border-b-2 border-[#33B5E5] bg-transparent py-2 text-base text-white placeholder-white/35 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 border-t border-white/15">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn border-0 border-r border-white/15 py-3 text-sm font-medium text-white/80"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="holo-btn-primary border-0 py-3 text-sm font-semibold text-white disabled:opacity-40"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add to Playlist"
    >
      <div
        className="holo-dialog-surface flex max-h-[80dvh] w-full max-w-sm flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-[#33B5E5] px-5 py-3.5">
          <h2 className="text-lg font-medium text-[#33B5E5]">Add to Playlist</h2>
          <p className="mt-0.5 truncate text-xs text-white/65">{track.title}</p>
        </div>

        <div className="holo-scroll flex-1 overflow-y-auto divide-y divide-white/10">
          {playlists.length === 0 ? (
            <div className="px-5 py-5 text-xs text-white/60">
              No playlists created yet. Enter a name below to create your first playlist.
            </div>
          ) : (
            playlists.map((pl) => {
              const contains = pl.trackIds.includes(track.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => onToggleTrackInPlaylist(pl.id, track.id)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-[#33B5E5]/15"
                >
                  <div className="min-w-0 pr-3">
                    <div className="truncate font-medium text-white">{pl.name}</div>
                    <div className="text-xs text-white/55">
                      {pl.trackIds.length} {pl.trackIds.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-bold ${
                      contains
                        ? 'border-[#33B5E5] bg-[#33B5E5]/25 text-[#33B5E5]'
                        : 'border-white/35 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-white/15 bg-black/25 px-4 py-3"
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
            className="min-w-0 flex-1 border-b border-white/35 bg-transparent py-1.5 text-sm text-white placeholder-white/40 focus:border-[#33B5E5] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="holo-btn-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Create
          </button>
        </form>

        <div className="border-t border-white/15">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn w-full border-0 py-3 text-sm font-medium text-white/90"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Add tracks to ${playlist.name}`}
    >
      <div
        className="holo-dialog-surface flex max-h-[82dvh] w-full max-w-md flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-[#33B5E5] px-5 py-3.5">
          <h2 className="text-lg font-medium text-[#33B5E5]">Manage Tracks: {playlist.name}</h2>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter library tracks..."
            className="mt-2 w-full border-b border-white/30 bg-transparent py-1 text-sm text-white placeholder-white/40 focus:border-[#33B5E5] focus:outline-none"
          />
        </div>

        <div className="holo-scroll flex-1 overflow-y-auto divide-y divide-white/10">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-white/55">
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
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#33B5E5]/12"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{t.title}</div>
                    <div className="truncate text-xs text-white/55">
                      {t.artist} · {formatTime(t.durationSec)}
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border text-xs font-bold ${
                      selected
                        ? 'border-[#33B5E5] bg-[#33B5E5]/25 text-[#33B5E5]'
                        : 'border-white/35 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-white/15">
          <button
            type="button"
            onClick={onClose}
            className="holo-btn-primary w-full border-0 py-3 text-sm font-semibold text-white"
          >
            Done ({playlist.trackIds.length} selected)
          </button>
        </div>
      </div>
    </div>
  );
}
