import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import {
  HoloAddToPlaylistDialog,
  HoloCreatePlaylistDialog,
  HoloPlaylistPickerDialog,
  HoloSortDialog,
} from './components/HoloDialogs';
import { HoloEqualizerPanel } from './components/HoloEqualizerPanel';
import {
  HoloBackIcon,
  HoloCloseIcon,
  HoloEqualizerIcon,
  HoloFolderMusicIcon,
  HoloMusicNoteIcon,
  HoloNextIcon,
  HoloPauseIcon,
  HoloPlayIcon,
  HoloPlaylistAddIcon,
  HoloPrevIcon,
  HoloRepeatIcon,
  HoloSearchIcon,
  HoloShuffleIcon,
  HoloSortIcon,
  HoloTrashIcon,
} from './components/HoloIcons';
import { useHoloAudioPlayer } from './hooks/useHoloAudioPlayer';
import type { EqualizerState, PlaylistRecord, SortMode, TabId, TrackRecord } from './types/music';
import { formatTime, isSupportedAudioFile, parseAudioFile } from './utils/audioMetadata';
import {
  clearAllTracksFromDb,
  deletePlaylistFromDb,
  deleteTrackFromDb,
  loadAllPlaylists,
  loadAllTracks,
  loadEqualizerState,
  saveEqualizerState,
  savePlaylist,
  saveTracks,
} from './utils/musicDb';

interface ImportProgress {
  current: number;
  total: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'songs', label: 'SONGS' },
  { id: 'artists', label: 'ARTISTS' },
  { id: 'albums', label: 'ALBUMS' },
  { id: 'playlists', label: 'PLAYLISTS' },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('songs');
  const [sortMode, setSortMode] = useState<SortMode>('title');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<TrackRecord | null>(null);
  const [pickerPlaylistId, setPickerPlaylistId] = useState<string | null>(null);

  const [equalizer, setEqualizer] = useState<EqualizerState>(() => loadEqualizerState());
  const [showEqualizer, setShowEqualizer] = useState(false);

  const player = useHoloAudioPlayer({ equalizer });

  // Load persisted library and playlists from IndexedDB on launch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedTracks, loadedPlaylists] = await Promise.all([
          loadAllTracks(),
          loadAllPlaylists(),
        ]);
        if (!cancelled) {
          setTracks(loadedTracks);
          setPlaylists(loadedPlaylists);
        }
      } catch (err) {
        if (!cancelled) {
          setStatusMessage(
            err instanceof Error ? err.message : 'Unable to read local IndexedDB library.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDb(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Configure non-standard folder selection attributes on folder input
  useEffect(() => {
    const input = folderInputRef.current;
    if (input) {
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
    }
  }, []);

  const handleEqualizerChange = (next: EqualizerState) => {
    setEqualizer(next);
    saveEqualizerState(next);
  };

  const handleImportFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const audioFiles = Array.from(fileList).filter(isSupportedAudioFile);
    if (audioFiles.length === 0) {
      setStatusMessage('No supported audio files found (MP3, FLAC, WAV, M4A, OGG).');
      return;
    }

    setStatusMessage(null);
    setShowImportMenu(false);
    setImportProgress({ current: 0, total: audioFiles.length });

    const parsedBatch: TrackRecord[] = [];
    for (let i = 0; i < audioFiles.length; i++) {
      try {
        const record = await parseAudioFile(audioFiles[i]);
        parsedBatch.push(record);
      } catch {
        // skip unreadable individual files
      }
      setImportProgress({ current: i + 1, total: audioFiles.length });
    }

    if (parsedBatch.length > 0) {
      try {
        await saveTracks(parsedBatch);
        setTracks((prev) => {
          const map = new Map<string, TrackRecord>();
          for (const t of prev) map.set(t.id, t);
          for (const t of parsedBatch) map.set(t.id, t);
          return Array.from(map.values());
        });
        setStatusMessage(
          `Saved ${parsedBatch.length} local ${parsedBatch.length === 1 ? 'track' : 'tracks'} to IndexedDB.`
        );
      } catch (err) {
        setStatusMessage(
          err instanceof Error ? err.message : 'Failed to persist audio files to IndexedDB.'
        );
      }
    }

    setImportProgress(null);
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleImportFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveTrack = async (trackId: string) => {
    player.stopIfTrackRemoved(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    try {
      await deleteTrackFromDb(trackId);
      // Also clean references from playlists
      const updatedPlaylists: PlaylistRecord[] = [];
      for (const pl of playlists) {
        if (pl.trackIds.includes(trackId)) {
          const nextPl: PlaylistRecord = {
            ...pl,
            trackIds: pl.trackIds.filter((id) => id !== trackId),
            updatedAt: Date.now(),
          };
          updatedPlaylists.push(nextPl);
          await savePlaylist(nextPl);
        } else {
          updatedPlaylists.push(pl);
        }
      }
      setPlaylists(updatedPlaylists);
    } catch {
      setStatusMessage('Could not remove track from IndexedDB.');
    }
  };

  const handleClearLibrary = async () => {
    setShowImportMenu(false);
    player.clearPlayback();
    setTracks([]);
    setSelectedArtist(null);
    setSelectedAlbumKey(null);
    try {
      await clearAllTracksFromDb();
      setStatusMessage('Cleared saved local audio library.');
    } catch {
      setStatusMessage('Failed to clear IndexedDB track store.');
    }
  };

  // Playlist CRUD
  const handleCreatePlaylist = async (name: string, initialTrackId?: string) => {
    const now = Date.now();
    const newPl: PlaylistRecord = {
      id: `pl_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      trackIds: initialTrackId ? [initialTrackId] : [],
      createdAt: now,
      updatedAt: now,
    };
    setPlaylists((prev) => [...prev, newPl]);
    try {
      await savePlaylist(newPl);
      setStatusMessage(`Created playlist "${name}".`);
    } catch {
      setStatusMessage('Failed to save playlist to IndexedDB.');
    }
  };

  const handleToggleTrackInPlaylist = async (playlistId: string, trackId: string) => {
    let targetUpdated: PlaylistRecord | null = null;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const exists = pl.trackIds.includes(trackId);
        const nextIds = exists
          ? pl.trackIds.filter((id) => id !== trackId)
          : [...pl.trackIds, trackId];
        targetUpdated = { ...pl, trackIds: nextIds, updatedAt: Date.now() };
        return targetUpdated;
      })
    );
    if (targetUpdated) {
      try {
        await savePlaylist(targetUpdated);
      } catch {
        setStatusMessage('Failed to update playlist in IndexedDB.');
      }
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
    try {
      await deletePlaylistFromDb(playlistId);
      setStatusMessage('Playlist deleted.');
    } catch {
      setStatusMessage('Failed to delete playlist from IndexedDB.');
    }
  };

  // Derived sorted & filtered track collections
  const trackMap = useMemo(() => {
    const map = new Map<string, TrackRecord>();
    for (const t of tracks) map.set(t.id, t);
    return map;
  }, [tracks]);

  const sortedTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.album.toLowerCase().includes(q)
        )
      : [...tracks];

    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'artist': {
          const cmp = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
          return cmp !== 0
            ? cmp
            : a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        }
        case 'album': {
          const cmp = a.album.localeCompare(b.album, undefined, { sensitivity: 'base' });
          return cmp !== 0
            ? cmp
            : a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        }
        case 'duration':
          return b.durationSec - a.durationSec;
        case 'added':
          return b.addedAt - a.addedAt;
        case 'title':
        default:
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
    });

    return filtered;
  }, [tracks, searchQuery, sortMode]);

  const artistsSummary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups = new Map<
      string,
      { name: string; tracks: TrackRecord[]; albums: Set<string>; artwork: string | null }
    >();
    for (const t of tracks) {
      const key = t.artist || 'Unknown Artist';
      if (q && !key.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) continue;
      let group = groups.get(key);
      if (!group) {
        group = { name: key, tracks: [], albums: new Set(), artwork: t.artworkDataUrl };
        groups.set(key, group);
      }
      group.tracks.push(t);
      group.albums.add(t.album);
      if (!group.artwork && t.artworkDataUrl) group.artwork = t.artworkDataUrl;
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [tracks, searchQuery]);

  const albumsSummary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups = new Map<
      string,
      { key: string; album: string; artist: string; tracks: TrackRecord[]; artwork: string | null }
    >();
    for (const t of tracks) {
      const albumName = t.album || 'Local Library';
      const key = `${albumName}::${t.artist}`;
      if (
        q &&
        !albumName.toLowerCase().includes(q) &&
        !t.artist.toLowerCase().includes(q)
      ) {
        continue;
      }
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          album: albumName,
          artist: t.artist,
          tracks: [],
          artwork: t.artworkDataUrl,
        };
        groups.set(key, group);
      }
      group.tracks.push(t);
      if (!group.artwork && t.artworkDataUrl) group.artwork = t.artworkDataUrl;
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.album.localeCompare(b.album, undefined, { sensitivity: 'base' })
    );
  }, [tracks, searchQuery]);

  const activeArtistGroup = useMemo(
    () => (selectedArtist ? artistsSummary.find((a) => a.name === selectedArtist) || null : null),
    [selectedArtist, artistsSummary]
  );

  const activeAlbumGroup = useMemo(
    () => (selectedAlbumKey ? albumsSummary.find((a) => a.key === selectedAlbumKey) || null : null),
    [selectedAlbumKey, albumsSummary]
  );

  const activePlaylist = useMemo(
    () => (selectedPlaylistId ? playlists.find((p) => p.id === selectedPlaylistId) || null : null),
    [selectedPlaylistId, playlists]
  );

  const activePlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    return activePlaylist.trackIds
      .map((id) => trackMap.get(id))
      .filter((t): t is TrackRecord => Boolean(t));
  }, [activePlaylist, trackMap]);

  const pickerPlaylist = useMemo(
    () => (pickerPlaylistId ? playlists.find((p) => p.id === pickerPlaylistId) || null : null),
    [pickerPlaylistId, playlists]
  );

  const activePlaybackFallbackList = useMemo(() => {
    if (activeTab === 'playlists' && activePlaylistTracks.length > 0) return activePlaylistTracks;
    if (activeTab === 'artists' && activeArtistGroup) return activeArtistGroup.tracks;
    if (activeTab === 'albums' && activeAlbumGroup) return activeAlbumGroup.tracks;
    return sortedTracks;
  }, [activeTab, activePlaylistTracks, activeArtistGroup, activeAlbumGroup, sortedTracks]);

  const seekMax = player.duration > 0 ? player.duration : player.currentTrack?.durationSec || 1;
  const seekPercent = seekMax > 0 ? Math.min(100, (player.currentTime / seekMax) * 100) : 0;

  const renderTrackRow = (
    track: TrackRecord,
    index: number,
    list: TrackRecord[],
    playlistContextId?: string
  ) => {
    const isCurrent = player.currentTrack?.id === track.id;
    return (
      <div
        key={`${playlistContextId || 'lib'}-${track.id}-${index}`}
        className={`holo-list-row flex min-h-[60px] items-center gap-3 pr-2 ${
          isCurrent ? 'holo-list-row-active' : ''
        }`}
      >
        {/* 4px Holo Blue Active Indicator */}
        <div
          className={`w-1 self-stretch shrink-0 ${
            isCurrent ? 'bg-[#33B5E5] shadow-[0_0_8px_#33B5E5]' : 'bg-transparent'
          }`}
        />

        {/* Clickable Track Main Area */}
        <button
          type="button"
          onClick={() => player.playTrackFromList(list, index)}
          className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-[#33B5E5]"
        >
          {/* Album Artwork or Holo Music Note */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-[#12171d] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            {track.artworkDataUrl ? (
              <img
                src={track.artworkDataUrl}
                alt={`${track.album} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <HoloMusicNoteIcon
                className={`h-5 w-5 ${isCurrent ? 'text-[#33B5E5]' : 'text-white/40'}`}
              />
            )}
            {isCurrent && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                {player.isPlaying ? (
                  <HoloPlayIcon className="h-5 w-5 text-[#33B5E5]" />
                ) : (
                  <HoloPauseIcon className="h-5 w-5 text-[#33B5E5]" />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-sm font-medium ${
                isCurrent ? 'font-semibold text-[#33B5E5]' : 'text-white'
              }`}
            >
              {track.title}
            </div>
            <div className="mt-0.5 truncate text-xs text-white/60">
              {track.artist}
              {track.album ? ` · ${track.album}` : ''}
            </div>
          </div>

          <span className="shrink-0 font-mono text-xs tabular-nums text-white/55">
            {formatTime(track.durationSec)}
          </span>
        </button>

        {/* Row Quick Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Add to playlist"
            aria-label={`Add ${track.title} to playlist`}
            onClick={() => setAddToPlaylistTrack(track)}
            className="flex h-9 w-9 items-center justify-center text-white/55 hover:bg-[#33B5E5]/15 hover:text-[#33B5E5]"
          >
            <HoloPlaylistAddIcon className="h-4 w-4" />
          </button>

          {playlistContextId ? (
            <button
              type="button"
              title="Remove from playlist"
              aria-label={`Remove ${track.title} from playlist`}
              onClick={() => void handleToggleTrackInPlaylist(playlistContextId, track.id)}
              className="flex h-9 w-9 items-center justify-center text-white/45 hover:bg-red-500/15 hover:text-red-300"
            >
              <HoloCloseIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              title="Remove from library"
              aria-label={`Remove ${track.title} from library`}
              onClick={() => void handleRemoveTrack(track.id)}
              className="flex h-9 w-9 items-center justify-center text-white/40 hover:bg-red-500/15 hover:text-red-300"
            >
              <HoloTrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="holo-bg-gradient flex h-dvh w-full flex-col overflow-hidden text-white">
      {/* Hidden Real File & Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac"
        multiple
        onChange={onFileInputChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Classic Holo Top Action Bar */}
      <header className="holo-actionbar-surface relative z-30 flex h-13 shrink-0 items-center justify-between border-b border-[#33B5E5]/60 px-3 sm:px-4">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2 pr-2">
            <HoloSearchIcon className="h-5 w-5 shrink-0 text-[#33B5E5]" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists, albums..."
              aria-label="Search local music library"
              className="min-w-0 flex-1 border-b-2 border-[#33B5E5] bg-transparent py-1 text-sm text-white placeholder-white/40 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="flex h-9 w-9 items-center justify-center text-white/75 hover:text-white"
            >
              <HoloCloseIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="holo-btn-primary flex h-8 w-8 shrink-0 items-center justify-center">
              <HoloMusicNoteIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-[#33B5E5]">
                Holo Music
              </h1>
              <p className="truncate text-[11px] text-white/65">
                {tracks.length === 0
                  ? 'Local Audio Library'
                  : `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} · ${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`}
              </p>
            </div>
          </div>
        )}

        {/* Action Bar Buttons separated by translucent Holo dividers */}
        <div className="flex shrink-0 items-center divide-x divide-white/12">
          {!searchOpen && (
            <button
              type="button"
              title="Search Library"
              aria-label="Search Library"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center text-white/85 hover:bg-white/5 hover:text-[#33B5E5]"
            >
              <HoloSearchIcon className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            title="5-Band Equalizer"
            aria-label="Open 5-Band Equalizer"
            aria-expanded={showEqualizer}
            onClick={() => {
              player.ensureWebAudioGraph();
              setShowEqualizer((prev) => !prev);
            }}
            className={`relative flex h-10 items-center gap-1.5 px-2.5 text-xs font-semibold hover:bg-white/5 ${
              equalizer.enabled ? 'text-[#33B5E5]' : 'text-white/75'
            }`}
          >
            <HoloEqualizerIcon className="h-5 w-5" />
            <span className="hidden sm:inline">EQ</span>
            {equalizer.enabled && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#33B5E5] shadow-[0_0_6px_#33B5E5]"
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            title="Sort Tracks"
            aria-label="Sort Tracks"
            onClick={() => setShowSortDialog(true)}
            className="flex h-10 w-10 items-center justify-center text-white/85 hover:bg-white/5 hover:text-[#33B5E5]"
          >
            <HoloSortIcon className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              title="Import Local Music"
              aria-label="Import Local Music"
              aria-expanded={showImportMenu}
              onClick={() => setShowImportMenu((prev) => !prev)}
              className="flex h-10 items-center gap-1.5 px-2.5 text-xs font-semibold text-white/90 hover:bg-white/5 hover:text-[#33B5E5]"
            >
              <HoloFolderMusicIcon className="h-5 w-5 text-[#33B5E5]" />
              <span className="hidden sm:inline">Add Music</span>
            </button>

            {showImportMenu && (
              <div
                className="holo-dialog-surface absolute right-0 top-11 z-50 w-52 divide-y divide-white/12 text-left text-sm"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => fileInputRef.current?.click()}
                  className="block w-full px-4 py-3 text-white/90 hover:bg-[#33B5E5]/20"
                >
                  Select Audio Files...
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => folderInputRef.current?.click()}
                  className="block w-full px-4 py-3 text-white/90 hover:bg-[#33B5E5]/20"
                >
                  Select Music Folder...
                </button>
                {tracks.length > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleClearLibrary()}
                    className="block w-full px-4 py-3 text-red-300 hover:bg-red-500/20"
                  >
                    Clear Saved Library
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Classic Holo Action Bar Tab Strip */}
      <nav
        aria-label="Music Library Sections"
        className="holo-tabbar-surface grid shrink-0 grid-cols-4 divide-x divide-white/12"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setShowImportMenu(false);
              }}
              className={`relative flex h-11 items-center justify-center px-2 text-xs font-bold tracking-wider whitespace-nowrap transition-colors ${
                isActive ? 'text-white' : 'text-white/55 hover:text-white/85'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="holo-tab-active-glow absolute inset-x-0 bottom-0 h-[3px] bg-[#33B5E5]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Import / Status Banner (when active) */}
      {(importProgress || statusMessage || player.playbackError) && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-between gap-3 border-b border-[#33B5E5]/35 bg-[#0f1c26]/95 px-4 py-2 text-xs"
        >
          <span className="text-[#9ee3fb]">
            {importProgress
              ? `Reading audio metadata & album art: ${importProgress.current} / ${importProgress.total}...`
              : player.playbackError || statusMessage}
          </span>
          {!importProgress && (
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss message"
              className="text-white/60 hover:text-white"
            >
              <HoloCloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Scrollable Content Region */}
      <main
        className="holo-scroll min-h-0 flex-1 overflow-y-auto"
        onClick={() => {
          if (showImportMenu) setShowImportMenu(false);
        }}
      >
        {isLoadingDb ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#33B5E5] border-t-transparent" />
            <p className="mt-3 text-sm text-white/70">Opening local IndexedDB music library...</p>
          </div>
        ) : tracks.length === 0 && activeTab !== 'playlists' ? (
          /* Clean Holo Empty State — Zero Sample Tracks */
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <div className="holo-dialog-surface max-w-md border-t-2 border-t-[#33B5E5] p-6 sm:p-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#33B5E5]/45 bg-[#33B5E5]/12 shadow-[0_0_20px_rgba(51,181,229,0.2)]">
                <HoloFolderMusicIcon className="h-8 w-8 text-[#33B5E5]" />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-white">No Local Audio Loaded</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Select MP3, FLAC, WAV, M4A, or OGG files from your device. Holo Music extracts
                track titles, artists, albums, and embedded album art and saves them in IndexedDB so
                your library stays ready on next launch.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="holo-btn-primary flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <HoloFolderMusicIcon className="h-4 w-4" />
                  <span>Select Music Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="holo-btn flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#33B5E5]"
                >
                  <span>Select Music Folder</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'songs' ? (
          <div>
            <div className="holo-subheader-surface flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-[#33B5E5]">
                {searchQuery.trim()
                  ? `SEARCH: "${searchQuery.trim()}"`
                  : `ALL LOCAL TRACKS · SORTED BY ${sortMode}`}
              </span>
              <span className="font-mono text-white/60">
                {sortedTracks.length} {sortedTracks.length === 1 ? 'TRACK' : 'TRACKS'}
              </span>
            </div>

            {sortedTracks.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-white/60">
                No tracks matched &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div>
                {sortedTracks.map((track, idx) => renderTrackRow(track, idx, sortedTracks))}
              </div>
            )}
          </div>
        ) : activeTab === 'artists' ? (
          activeArtistGroup ? (
            <div>
              <div className="holo-subheader-surface flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSelectedArtist(null)}
                  className="holo-btn flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#33B5E5]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>All Artists</span>
                </button>
                <div className="min-w-0 px-3 text-center">
                  <div className="truncate text-xs font-bold uppercase tracking-wider text-white">
                    {activeArtistGroup.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => player.playTrackFromList(activeArtistGroup.tracks, 0)}
                  className="holo-btn-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  Play All
                </button>
              </div>
              <div>
                {activeArtistGroup.tracks.map((track, idx) =>
                  renderTrackRow(track, idx, activeArtistGroup.tracks)
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="holo-subheader-surface flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
                <span className="text-[#33B5E5]">ARTISTS</span>
                <span className="font-mono text-white/60">{artistsSummary.length} ARTISTS</span>
              </div>
              {artistsSummary.map((artist) => (
                <button
                  key={artist.name}
                  type="button"
                  onClick={() => setSelectedArtist(artist.name)}
                  className="holo-list-row flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-[#12171d]">
                    {artist.artwork ? (
                      <img
                        src={artist.artwork}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <HoloMusicNoteIcon className="h-5 w-5 text-[#33B5E5]/70" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{artist.name}</div>
                    <div className="mt-0.5 text-xs text-white/60">
                      {artist.albums.size} {artist.albums.size === 1 ? 'album' : 'albums'} ·{' '}
                      {artist.tracks.length} {artist.tracks.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#33B5E5]">Open ›</span>
                </button>
              ))}
            </div>
          )
        ) : activeTab === 'albums' ? (
          activeAlbumGroup ? (
            <div>
              <div className="holo-subheader-surface flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlbumKey(null)}
                  className="holo-btn flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#33B5E5]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>All Albums</span>
                </button>
                <div className="min-w-0 px-3 text-center">
                  <div className="truncate text-xs font-bold uppercase tracking-wider text-white">
                    {activeAlbumGroup.album}
                  </div>
                  <div className="truncate text-[11px] text-white/60">{activeAlbumGroup.artist}</div>
                </div>
                <button
                  type="button"
                  onClick={() => player.playTrackFromList(activeAlbumGroup.tracks, 0)}
                  className="holo-btn-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  Play Album
                </button>
              </div>
              <div>
                {activeAlbumGroup.tracks.map((track, idx) =>
                  renderTrackRow(track, idx, activeAlbumGroup.tracks)
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="holo-subheader-surface flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
                <span className="text-[#33B5E5]">ALBUMS</span>
                <span className="font-mono text-white/60">{albumsSummary.length} ALBUMS</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albumsSummary.map((alb) => (
                  <button
                    key={alb.key}
                    type="button"
                    onClick={() => setSelectedAlbumKey(alb.key)}
                    className="holo-btn flex flex-col overflow-hidden text-left"
                  >
                    <div className="flex aspect-square w-full items-center justify-center overflow-hidden border-b border-white/10 bg-[#101419]">
                      {alb.artwork ? (
                        <img
                          src={alb.artwork}
                          alt={alb.album}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HoloMusicNoteIcon className="h-10 w-10 text-[#33B5E5]/55" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="truncate text-xs font-semibold text-white">{alb.album}</div>
                      <div className="mt-0.5 truncate text-[11px] text-white/60">{alb.artist}</div>
                      <div className="mt-1 font-mono text-[10px] text-[#33B5E5]">
                        {alb.tracks.length} {alb.tracks.length === 1 ? 'TRACK' : 'TRACKS'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : /* PLAYLISTS TAB */
        activePlaylist ? (
          <div>
            <div className="holo-subheader-surface flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylistId(null)}
                  className="holo-btn flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#33B5E5]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>Playlists</span>
                </button>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {activePlaylist.name}
                  </div>
                  <div className="text-[11px] text-white/60">
                    {activePlaylistTracks.length}{' '}
                    {activePlaylistTracks.length === 1 ? 'track' : 'tracks'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerPlaylistId(activePlaylist.id)}
                  className="holo-btn px-3 py-1.5 text-xs font-semibold text-[#33B5E5]"
                >
                  + Add / Remove Tracks
                </button>
                <button
                  type="button"
                  disabled={activePlaylistTracks.length === 0}
                  onClick={() => player.playTrackFromList(activePlaylistTracks, 0)}
                  className="holo-btn-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Play All
                </button>
              </div>
            </div>

            {activePlaylistTracks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-white/65">
                  This playlist has no tracks yet.
                </p>
                <button
                  type="button"
                  onClick={() => setPickerPlaylistId(activePlaylist.id)}
                  className="holo-btn-primary mt-4 px-4 py-2 text-xs font-semibold text-white"
                >
                  Add Tracks from Library
                </button>
              </div>
            ) : (
              <div>
                {activePlaylistTracks.map((track, idx) =>
                  renderTrackRow(track, idx, activePlaylistTracks, activePlaylist.id)
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="holo-subheader-surface flex items-center justify-between px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#33B5E5]">
                SAVED PLAYLISTS ({playlists.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCreatePlaylist(true)}
                className="holo-btn-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                + New Playlist
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="holo-dialog-surface max-w-sm border-t-2 border-t-[#33B5E5] p-6">
                  <HoloPlaylistAddIcon className="mx-auto h-9 w-9 text-[#33B5E5]" />
                  <h2 className="mt-3 text-base font-semibold text-white">No Playlists Yet</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                    Create custom playlists and save them locally in IndexedDB alongside your music
                    library.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreatePlaylist(true)}
                    className="holo-btn-primary mt-4 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Create First Playlist
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {playlists.map((pl) => {
                  const resolvedTracks = pl.trackIds
                    .map((id) => trackMap.get(id))
                    .filter((t): t is TrackRecord => Boolean(t));
                  const totalSec = resolvedTracks.reduce((sum, t) => sum + t.durationSec, 0);
                  const cover = resolvedTracks.find((t) => t.artworkDataUrl)?.artworkDataUrl || null;

                  return (
                    <div
                      key={pl.id}
                      className="holo-list-row flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-[#12171d]">
                          {cover ? (
                            <img src={cover} alt={pl.name} className="h-full w-full object-cover" />
                          ) : (
                            <HoloPlaylistAddIcon className="h-5 w-5 text-[#33B5E5]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{pl.name}</div>
                          <div className="mt-0.5 text-xs text-white/60">
                            {resolvedTracks.length}{' '}
                            {resolvedTracks.length === 1 ? 'track' : 'tracks'} ·{' '}
                            {formatTime(totalSec)}
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          disabled={resolvedTracks.length === 0}
                          onClick={() => player.playTrackFromList(resolvedTracks, 0)}
                          aria-label={`Play ${pl.name}`}
                          className="holo-btn flex h-9 w-9 items-center justify-center text-[#33B5E5] disabled:opacity-35"
                        >
                          <HoloPlayIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerPlaylistId(pl.id)}
                          className="holo-btn px-2.5 py-1.5 text-xs font-medium text-white/85"
                        >
                          Tracks
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${pl.name}`}
                          onClick={() => void handleDeletePlaylist(pl.id)}
                          className="holo-btn flex h-9 w-9 items-center justify-center text-white/55 hover:text-red-300"
                        >
                          <HoloTrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Docked Holo Bottom Playback Bar */}
      <footer className="holo-dock-surface shrink-0 border-t-2 border-t-[#33B5E5]">
        {/* Now Playing Metadata & Quick Controls */}
        <div className="flex items-center justify-between gap-3 px-3 pt-2.5 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-[#33B5E5]/40 bg-[#0d1218]">
              {player.currentTrack?.artworkDataUrl ? (
                <img
                  src={player.currentTrack.artworkDataUrl}
                  alt={player.currentTrack.album}
                  className="h-full w-full object-cover"
                />
              ) : (
                <HoloMusicNoteIcon className="h-5 w-5 text-[#33B5E5]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {player.currentTrack ? player.currentTrack.title : 'Select a track to play'}
              </div>
              <div className="truncate text-xs text-[#33B5E5]">
                {player.currentTrack
                  ? `${player.currentTrack.artist} · ${player.currentTrack.album}`
                  : 'Authentic Holo Dark Local Player'}
              </div>
            </div>
          </div>

          {/* Compact Mode & Playlist Buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title={player.shuffle ? 'Shuffle: On' : 'Shuffle: Off'}
              aria-label="Toggle Shuffle"
              aria-pressed={player.shuffle}
              onClick={player.toggleShuffle}
              className={`flex h-8 w-8 items-center justify-center border ${
                player.shuffle
                  ? 'border-[#33B5E5] bg-[#33B5E5]/20 text-[#33B5E5]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <HoloShuffleIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              title={`Repeat: ${player.repeat}`}
              aria-label="Cycle Repeat Mode"
              onClick={player.cycleRepeat}
              className={`relative flex h-8 w-8 items-center justify-center border ${
                player.repeat !== 'off'
                  ? 'border-[#33B5E5] bg-[#33B5E5]/20 text-[#33B5E5]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <HoloRepeatIcon className="h-4 w-4" />
              {player.repeat === 'one' && (
                <span className="absolute bottom-0 right-0.5 text-[9px] font-bold text-[#33B5E5]">
                  1
                </span>
              )}
            </button>

            {player.currentTrack && (
              <button
                type="button"
                title="Add current track to playlist"
                aria-label="Add current track to playlist"
                onClick={() => setAddToPlaylistTrack(player.currentTrack)}
                className="flex h-8 w-8 items-center justify-center text-white/65 hover:text-[#33B5E5]"
              >
                <HoloPlaylistAddIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Holo SeekBar with Elapsed / Total Time */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4">
          <span className="min-w-[38px] font-mono text-xs tabular-nums text-[#33B5E5]">
            {formatTime(player.currentTime)}
          </span>

          <input
            type="range"
            aria-label="Playback seek bar"
            min={0}
            max={seekMax}
            step={0.5}
            disabled={!player.currentTrack}
            value={Math.min(player.currentTime, seekMax)}
            onChange={(e) => player.seekTo(Number(e.target.value))}
            className="holo-seekbar flex-1 disabled:opacity-40"
            style={
              {
                '--seek-pct': `${seekPercent}%`,
                '--seek-color': '#33B5E5',
              } as CSSProperties
            }
          />

          <span className="min-w-[38px] text-right font-mono text-xs tabular-nums text-white/65">
            {formatTime(player.duration || player.currentTrack?.durationSec || 0)}
          </span>
        </div>

        {/* Classic Beveled Holo Transport Controls */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/12 bg-black/35 px-3 py-2 sm:px-4">
          <button
            type="button"
            aria-label="Previous track"
            onClick={player.playPrevious}
            className="holo-btn flex h-11 items-center justify-center text-white"
          >
            <HoloPrevIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
            onClick={() => player.togglePlayPause(activePlaybackFallbackList)}
            className="holo-btn flex h-11 items-center justify-center text-[#33B5E5]"
          >
            {player.isPlaying ? (
              <HoloPauseIcon className="h-6 w-6" />
            ) : (
              <HoloPlayIcon className="h-6 w-6" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next track"
            onClick={player.playNext}
            className="holo-btn flex h-11 items-center justify-center text-white"
          >
            <HoloNextIcon className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {/* Slide-Up Holo 5-Band Equalizer Panel */}
      <HoloEqualizerPanel
        isOpen={showEqualizer}
        equalizer={equalizer}
        onChange={handleEqualizerChange}
        onClose={() => setShowEqualizer(false)}
        onUserInteract={player.ensureWebAudioGraph}
      />

      {/* Holo Dialogs */}
      <HoloSortDialog
        isOpen={showSortDialog}
        currentSort={sortMode}
        onSelect={setSortMode}
        onClose={() => setShowSortDialog(false)}
      />

      <HoloCreatePlaylistDialog
        isOpen={showCreatePlaylist}
        onConfirm={(name) => void handleCreatePlaylist(name)}
        onClose={() => setShowCreatePlaylist(false)}
      />

      <HoloAddToPlaylistDialog
        track={addToPlaylistTrack}
        playlists={playlists}
        onToggleTrackInPlaylist={(plId, trackId) =>
          void handleToggleTrackInPlaylist(plId, trackId)
        }
        onCreateAndAdd={(name, trackId) => void handleCreatePlaylist(name, trackId)}
        onClose={() => setAddToPlaylistTrack(null)}
      />

      <HoloPlaylistPickerDialog
        playlist={pickerPlaylist}
        allTracks={tracks}
        onToggleTrack={(plId, trackId) => void handleToggleTrackInPlaylist(plId, trackId)}
        onClose={() => setPickerPlaylistId(null)}
      />
    </div>
  );
}
