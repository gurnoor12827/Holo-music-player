import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { HoloAlbumArtDialog } from './components/HoloAlbumArtDialog';
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
  HoloImageEditIcon,
  HoloMusicNoteIcon,
  HoloNextIcon,
  HoloPauseIcon,
  HoloPlayIcon,
  HoloPlaylistAddIcon,
  HoloPrevIcon,
  HoloSearchIcon,
  HoloSettingsIcon,
  HoloSortIcon,
  HoloTrashIcon,
  HoloVinylIcon,
} from './components/HoloIcons';
import { NowPlayingView } from './components/NowPlayingView';
import { SettingsView } from './components/SettingsView';
import { useHoloAudioPlayer } from './hooks/useHoloAudioPlayer';
import type {
  AppSettings,
  EqualizerState,
  PlaylistRecord,
  SortMode,
  TabId,
  TrackRecord,
} from './types/music';
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
import { applyDocumentTheme, loadAppSettings, saveAppSettings } from './utils/themeConfig';

interface ImportProgress {
  current: number;
  total: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'songs', label: 'Tracks' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('songs');
  const [sortMode, setSortMode] = useState<SortMode>(() => loadAppSettings().defaultSort);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<TrackRecord | null>(null);
  const [pickerPlaylistId, setPickerPlaylistId] = useState<string | null>(null);
  const [editingArtState, setEditingArtState] = useState<{
    track: TrackRecord;
    isCorrupted: boolean;
  } | null>(null);
  const [brokenArtIds, setBrokenArtIds] = useState<Set<string>>(() => new Set());

  const [equalizer, setEqualizer] = useState<EqualizerState>(() => loadEqualizerState());
  const [showEqualizer, setShowEqualizer] = useState(false);

  const player = useHoloAudioPlayer({
    equalizer,
    crossfadeSeconds: settings.crossfadeSeconds,
    reverbPreset: settings.reverbPreset,
  });

  useEffect(() => {
    applyDocumentTheme(settings.theme);
  }, [settings.theme]);

  // Shake-to-skip via DeviceMotion API when enabled in Settings
  useEffect(() => {
    if (!settings.shakeToSkip || typeof window === 'undefined') return;
    let lastSkipAt = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let hasSample = false;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      if (!hasSample) {
        lastX = x;
        lastY = y;
        lastZ = z;
        hasSample = true;
        return;
      }
      const dx = x - lastX;
      const dy = y - lastY;
      const dz = z - lastZ;
      lastX = x;
      lastY = y;
      lastZ = z;

      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const now = Date.now();
      if (delta > 18 && now - lastSkipAt > 1400) {
        lastSkipAt = now;
        player.playNext();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [settings.shakeToSkip, player.playNext]);

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

  const handleSettingsChange = (next: AppSettings) => {
    if (next.defaultSort !== settings.defaultSort) {
      setSortMode(next.defaultSort);
    }
    setSettings(next);
    saveAppSettings(next);
  };

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
          `Added ${parsedBatch.length} ${parsedBatch.length === 1 ? 'track' : 'tracks'}.`
        );
      } catch (err) {
        setStatusMessage(
          err instanceof Error ? err.message : 'Failed to save audio files to IndexedDB.'
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
    setShowNowPlaying(false);
    player.clearPlayback();
    setTracks([]);
    setSelectedArtist(null);
    setSelectedAlbumKey(null);
    try {
      await clearAllTracksFromDb();
      setStatusMessage('Library cleared.');
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

  const markArtworkCorrupted = (trackId: string) => {
    setBrokenArtIds((prev) => {
      if (prev.has(trackId)) return prev;
      const next = new Set(prev);
      next.add(trackId);
      return next;
    });
  };

  const openAlbumArtEditor = (track: TrackRecord) => {
    setEditingArtState({
      track,
      isCorrupted: !track.artworkDataUrl || brokenArtIds.has(track.id),
    });
  };

  const handleSaveArtwork = async (
    targetTrack: TrackRecord,
    artworkDataUrl: string | null,
    applyToAlbum: boolean
  ) => {
    const affectedTracks = tracks.filter(
      (t) =>
        t.id === targetTrack.id ||
        (applyToAlbum && t.album === targetTrack.album && t.artist === targetTrack.artist)
    );
    if (affectedTracks.length === 0) return;

    const affectedIds = new Set(affectedTracks.map((t) => t.id));
    const updatedRecords = affectedTracks.map((t) => ({ ...t, artworkDataUrl }));

    setTracks((prev) =>
      prev.map((t) => (affectedIds.has(t.id) ? { ...t, artworkDataUrl } : t))
    );
    setBrokenArtIds((prev) => {
      const next = new Set(prev);
      for (const id of affectedIds) {
        next.delete(id);
      }
      return next;
    });
    player.updateTracksArtwork(affectedIds, artworkDataUrl);

    try {
      await saveTracks(updatedRecords);
      setStatusMessage(
        artworkDataUrl
          ? `Updated cover art (${updatedRecords.length} ${
              updatedRecords.length === 1 ? 'track' : 'tracks'
            }).`
          : `Cleared cover art (${updatedRecords.length} ${
              updatedRecords.length === 1 ? 'track' : 'tracks'
            }).`
      );
    } catch {
      setStatusMessage('Failed to save cover art to IndexedDB.');
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
        group = {
          name: key,
          tracks: [],
          albums: new Set(),
          artwork: !brokenArtIds.has(t.id) ? t.artworkDataUrl : null,
        };
        groups.set(key, group);
      }
      group.tracks.push(t);
      group.albums.add(t.album);
      if (!group.artwork && t.artworkDataUrl && !brokenArtIds.has(t.id)) {
        group.artwork = t.artworkDataUrl;
      }
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [tracks, searchQuery, brokenArtIds]);

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
          artwork: !brokenArtIds.has(t.id) ? t.artworkDataUrl : null,
        };
        groups.set(key, group);
      }
      group.tracks.push(t);
      if (!group.artwork && t.artworkDataUrl && !brokenArtIds.has(t.id)) {
        group.artwork = t.artworkDataUrl;
      }
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.album.localeCompare(b.album, undefined, { sensitivity: 'base' })
    );
  }, [tracks, searchQuery, brokenArtIds]);

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
  const queuePositionLabel =
    player.currentTrack && player.queueIndex >= 0 && player.queueLength > 0
      ? `${player.queueIndex + 1} / ${player.queueLength}`
      : null;

  const renderTrackRow = (
    track: TrackRecord,
    index: number,
    list: TrackRecord[],
    playlistContextId?: string
  ) => {
    const isCurrent = player.currentTrack?.id === track.id;
    const isArtBroken = brokenArtIds.has(track.id);
    const hasValidArt = Boolean(track.artworkDataUrl) && !isArtBroken;

    return (
      <div
        key={`${playlistContextId || 'lib'}-${track.id}-${index}`}
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
          onClick={() => player.playTrackFromList(list, index)}
          className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          {settings.showListArtwork && (
            <div className="theme-artwork-box relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
              {hasValidArt && track.artworkDataUrl ? (
                <img
                  src={track.artworkDataUrl}
                  alt={`${track.album} cover`}
                  onError={() => markArtworkCorrupted(track.id)}
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
                  {player.isPlaying ? (
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
            onClick={() => openAlbumArtEditor(track)}
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
            onClick={() => setAddToPlaylistTrack(track)}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)]"
          >
            <HoloPlaylistAddIcon className="h-4 w-4" />
          </button>

          {playlistContextId ? (
            <button
              type="button"
              title="Remove from Playlist"
              aria-label={`Remove ${track.title} from playlist`}
              onClick={() => void handleToggleTrackInPlaylist(playlistContextId, track.id)}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
            >
              <HoloCloseIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              title="Remove Track"
              aria-label={`Remove ${track.title} from library`}
              onClick={() => void handleRemoveTrack(track.id)}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
            >
              <HoloTrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="holo-bg-gradient flex h-dvh w-full flex-col overflow-hidden">
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

      {/* Top Action Bar */}
      <header className="holo-actionbar-surface relative z-30 flex h-13 shrink-0 items-center justify-between px-3 sm:px-4">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2 pr-2">
            <HoloSearchIcon className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks, artists, albums..."
              aria-label="Search library"
              className="min-w-0 flex-1 border-b-2 border-[var(--accent)] bg-transparent py-1 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <HoloCloseIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--accent)]">
              Holo Player
            </h1>
            <p className="truncate font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · {playlists.length}{' '}
              {playlists.length === 1 ? 'playlist' : 'playlists'}
            </p>
          </div>
        )}

        {/* Action Bar Buttons */}
        <div className="flex shrink-0 items-center divide-x divide-[var(--divider)]">
          {!searchOpen && (
            <button
              type="button"
              title="Search"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="flex min-h-[44px] min-w-[42px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
            >
              <HoloSearchIcon className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            title="Equalizer"
            aria-label="Equalizer"
            aria-expanded={showEqualizer}
            onClick={() => {
              player.ensureWebAudioGraph();
              setShowEqualizer((prev) => !prev);
            }}
            className={`flex min-h-[44px] items-center gap-1.5 px-2.5 text-xs font-semibold ${
              equalizer.enabled ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            <HoloEqualizerIcon className="h-5 w-5" />
            <span className="hidden sm:inline">EQ</span>
          </button>

          <button
            type="button"
            title="Sort"
            aria-label="Sort"
            onClick={() => setShowSortDialog(true)}
            className="flex min-h-[44px] min-w-[42px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
          >
            <HoloSortIcon className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              title="Add Music"
              aria-label="Add Music"
              aria-expanded={showImportMenu}
              onClick={() => setShowImportMenu((prev) => !prev)}
              className="flex min-h-[44px] items-center gap-1.5 px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
            >
              <HoloFolderMusicIcon className="h-5 w-5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Add</span>
            </button>

            {showImportMenu && (
              <div
                className="holo-dialog-surface absolute right-0 top-12 z-50 w-48 divide-y divide-[var(--divider)] text-left text-sm"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => fileInputRef.current?.click()}
                  className="block min-h-[44px] w-full px-4 py-2.5 hover:bg-[var(--surface-row-hover)]"
                >
                  Select Audio Files
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => folderInputRef.current?.click()}
                  className="block min-h-[44px] w-full px-4 py-2.5 hover:bg-[var(--surface-row-hover)]"
                >
                  Select Music Folder
                </button>
                {tracks.length > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleClearLibrary()}
                    className="block min-h-[44px] w-full px-4 py-2.5 text-[var(--danger-text)] hover:bg-[var(--surface-row-hover)]"
                  >
                    Clear Library
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            onClick={() => {
              setShowImportMenu(false);
              setShowSettings(true);
            }}
            className="flex min-h-[44px] min-w-[42px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
          >
            <HoloSettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        aria-label="Library Sections"
        className="holo-tabbar-surface grid shrink-0 grid-cols-4 divide-x divide-[var(--divider)]"
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
              style={{ background: isActive ? 'var(--tab-active-bg)' : undefined }}
              className={`relative flex h-11 items-center justify-center px-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="holo-tab-active-glow absolute inset-x-0 bottom-0 h-[3px]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Banner */}
      {(importProgress || statusMessage || player.playbackError) && (
        <div
          role="status"
          className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--divider)] px-4 py-2 text-xs"
          style={{
            backgroundColor: 'var(--surface-banner)',
            color: 'var(--text-banner)',
          }}
        >
          <span>
            {importProgress
              ? `Reading audio metadata: ${importProgress.current} / ${importProgress.total}...`
              : player.playbackError || statusMessage}
          </span>
          {!importProgress && (
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss message"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <HoloCloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Scrollable Library Content */}
      <main
        className="holo-scroll min-h-0 flex-1 overflow-y-auto"
        onClick={() => {
          if (showImportMenu) setShowImportMenu(false);
        }}
      >
        {isLoadingDb ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading local library...</p>
          </div>
        ) : tracks.length === 0 && activeTab !== 'playlists' ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-6 py-10 text-center">
            <HoloFolderMusicIcon className="h-12 w-12 text-[var(--accent)]" />

            <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No Local Tracks
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
              Choose MP3, FLAC, WAV, M4A, or OGG files or a music folder from your device. Tracks
              and playlists are saved locally.
            </p>

            <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5 sm:max-w-sm sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="holo-btn-primary flex min-h-11 flex-1 items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
              >
                <HoloFolderMusicIcon className="h-4 w-4" />
                <span>Select Files</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="holo-btn flex min-h-11 flex-1 items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--accent)]"
              >
                <span>Select Folder</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'songs' ? (
          <div>
            <div className="holo-subheader-surface flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-[var(--accent)]">
                {searchQuery.trim()
                  ? `Search: "${searchQuery.trim()}"`
                  : `Tracks · ${sortMode}`}
              </span>
              <span className="font-mono tabular-nums text-[var(--text-dim)]">
                {sortedTracks.length} {sortedTracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {sortedTracks.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
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
                  className="holo-btn flex min-h-[38px] items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>Artists</span>
                </button>
                <div className="min-w-0 px-3 text-center">
                  <div className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {activeArtistGroup.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => player.playTrackFromList(activeArtistGroup.tracks, 0)}
                  className="holo-btn-primary min-h-[38px] px-3 py-1 text-xs font-semibold"
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
                <span className="text-[var(--accent)]">Artists</span>
                <span className="font-mono tabular-nums text-[var(--text-dim)]">
                  {artistsSummary.length}
                </span>
              </div>
              {artistsSummary.map((artist) => (
                <button
                  key={artist.name}
                  type="button"
                  onClick={() => setSelectedArtist(artist.name)}
                  className="holo-list-row flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="theme-artwork-box flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
                    {artist.artwork ? (
                      <img
                        src={artist.artwork}
                        alt={artist.name}
                        onError={() => {
                          const broken = artist.tracks.find(
                            (t) => t.artworkDataUrl === artist.artwork
                          );
                          if (broken) markArtworkCorrupted(broken.id);
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <HoloMusicNoteIcon className="h-5 w-5 text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {artist.name}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {artist.albums.size} {artist.albums.size === 1 ? 'album' : 'albums'} ·{' '}
                      {artist.tracks.length} {artist.tracks.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent)]">Open</span>
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
                  className="holo-btn flex min-h-[38px] items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>Albums</span>
                </button>
                <div className="min-w-0 px-3 text-center">
                  <div className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {activeAlbumGroup.album}
                  </div>
                  <div className="truncate text-[11px] text-[var(--text-secondary)]">
                    {activeAlbumGroup.artist}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => player.playTrackFromList(activeAlbumGroup.tracks, 0)}
                  className="holo-btn-primary min-h-[38px] px-3 py-1 text-xs font-semibold"
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
                <span className="text-[var(--accent)]">Albums</span>
                <span className="font-mono tabular-nums text-[var(--text-dim)]">
                  {albumsSummary.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albumsSummary.map((alb) => (
                  <button
                    key={alb.key}
                    type="button"
                    onClick={() => setSelectedAlbumKey(alb.key)}
                    className="holo-btn flex flex-col overflow-hidden text-left"
                  >
                    <div
                      className="flex aspect-square w-full items-center justify-center overflow-hidden border-b border-[var(--divider)]"
                      style={{ backgroundColor: 'var(--surface-artwork)' }}
                    >
                      {alb.artwork ? (
                        <img
                          src={alb.artwork}
                          alt={alb.album}
                          onError={() => {
                            const broken = alb.tracks.find((t) => t.artworkDataUrl === alb.artwork);
                            if (broken) markArtworkCorrupted(broken.id);
                          }}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HoloVinylIcon className="h-14 w-14 text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                        {alb.album}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                        {alb.artist}
                      </div>
                      <div className="mt-1 font-mono text-[10px] tabular-nums text-[var(--accent)]">
                        {alb.tracks.length} {alb.tracks.length === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : activePlaylist ? (
          <div>
            <div className="holo-subheader-surface flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylistId(null)}
                  className="holo-btn flex min-h-[38px] items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"
                >
                  <HoloBackIcon className="h-4 w-4" />
                  <span>Playlists</span>
                </button>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {activePlaylist.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {activePlaylistTracks.length}{' '}
                    {activePlaylistTracks.length === 1 ? 'track' : 'tracks'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerPlaylistId(activePlaylist.id)}
                  className="holo-btn min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"
                >
                  Edit Tracks
                </button>
                <button
                  type="button"
                  disabled={activePlaylistTracks.length === 0}
                  onClick={() => player.playTrackFromList(activePlaylistTracks, 0)}
                  className="holo-btn-primary min-h-[38px] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                >
                  Play All
                </button>
              </div>
            </div>

            {activePlaylistTracks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">This playlist is empty.</p>
                <button
                  type="button"
                  onClick={() => setPickerPlaylistId(activePlaylist.id)}
                  className="holo-btn-primary mt-4 px-4 py-2 text-xs font-semibold"
                >
                  Add Tracks
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                Playlists ({playlists.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCreatePlaylist(true)}
                className="holo-btn-primary min-h-[36px] px-3 py-1 text-xs font-semibold"
              >
                New Playlist
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <HoloPlaylistAddIcon className="h-10 w-10 text-[var(--accent)]" />
                <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                  No Playlists
                </h2>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--text-secondary)]">
                  Create playlists and store track lists locally.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylist(true)}
                  className="holo-btn-primary mt-5 min-h-[42px] px-5 py-2 text-xs font-semibold"
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              <div>
                {playlists.map((pl) => {
                  const resolvedTracks = pl.trackIds
                    .map((id) => trackMap.get(id))
                    .filter((t): t is TrackRecord => Boolean(t));
                  const totalSec = resolvedTracks.reduce((sum, t) => sum + t.durationSec, 0);
                  const coverTrack = resolvedTracks.find(
                    (t) => t.artworkDataUrl && !brokenArtIds.has(t.id)
                  );
                  const cover = coverTrack?.artworkDataUrl || null;

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
                        <div className="theme-artwork-box flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
                          {cover ? (
                            <img
                              src={cover}
                              alt={pl.name}
                              onError={() => {
                                if (coverTrack) markArtworkCorrupted(coverTrack.id);
                              }}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <HoloPlaylistAddIcon className="h-5 w-5 text-[var(--accent)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {pl.name}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
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
                          className="holo-btn flex h-10 w-10 items-center justify-center text-[var(--accent)] disabled:opacity-35"
                        >
                          <HoloPlayIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerPlaylistId(pl.id)}
                          className="holo-btn min-h-[40px] px-2.5 py-1.5 text-xs font-medium"
                        >
                          Tracks
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${pl.name}`}
                          onClick={() => void handleDeletePlaylist(pl.id)}
                          className="holo-btn flex h-10 w-10 items-center justify-center text-[var(--text-dim)] hover:text-[var(--danger-text)]"
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

      {/* Compact Docked Mini-Player (Tap track info to open full-screen Now Playing) */}
      <footer className="holo-dock-surface relative shrink-0">
        {/* Top Edge Thin Progress Indicator */}
        <div
          className="h-[2px] w-full"
          style={{ backgroundColor: 'var(--seek-track-bg)' }}
          aria-hidden="true"
        >
          <div
            className="h-full transition-[width] duration-150"
            style={{
              width: `${seekPercent}%`,
              backgroundColor: 'var(--accent)',
            }}
          />
        </div>

        <div className="flex h-[62px] items-stretch justify-between">
          {/* Tappable Mini-Player Track Area -> Opens Full-Screen Now Playing */}
          <button
            type="button"
            onClick={() => setShowNowPlaying(true)}
            aria-label="Open Now Playing screen"
            className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <div className="theme-artwork-box flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
              {player.currentTrack?.artworkDataUrl &&
              !brokenArtIds.has(player.currentTrack.id) ? (
                <img
                  src={player.currentTrack.artworkDataUrl}
                  alt={player.currentTrack.album}
                  onError={() => {
                    if (player.currentTrack) {
                      markArtworkCorrupted(player.currentTrack.id);
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <HoloVinylIcon className="h-7 w-7 text-[var(--accent)]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {player.currentTrack ? player.currentTrack.title : 'No track playing'}
              </div>
              <div className="truncate text-xs text-[var(--accent)]">
                {player.currentTrack
                  ? `${player.currentTrack.artist} · ${formatTime(player.currentTime)} / ${formatTime(seekMax)}`
                  : 'Tap to open Now Playing'}
              </div>
            </div>
          </button>

          {/* Integrated Flush Mini-Player Transport Controls */}
          <div className="flex shrink-0 items-stretch">
            <button
              type="button"
              aria-label="Previous track"
              onClick={player.playPrevious}
              className="holo-dock-btn flex w-12 items-center justify-center"
            >
              <HoloPrevIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label={player.isPlaying ? 'Pause' : 'Play'}
              onClick={() => player.togglePlayPause(activePlaybackFallbackList)}
              className="holo-dock-btn-primary flex w-14 items-center justify-center"
            >
              {player.isPlaying ? (
                <HoloPauseIcon className="h-5 w-5" />
              ) : (
                <HoloPlayIcon className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              aria-label="Next track"
              onClick={player.playNext}
              className="holo-dock-btn flex w-12 items-center justify-center"
            >
              <HoloNextIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Full-Screen Now Playing View */}
      <NowPlayingView
        isOpen={showNowPlaying}
        theme={settings.theme}
        visualizerMode={settings.visualizerMode}
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        shuffle={player.shuffle}
        repeat={player.repeat}
        isArtworkBroken={
          player.currentTrack ? brokenArtIds.has(player.currentTrack.id) : false
        }
        queuePositionLabel={queuePositionLabel}
        getAudioMotionTarget={player.getAudioMotionTarget}
        onChangeVisualizerMode={(mode) =>
          handleSettingsChange({ ...settings, visualizerMode: mode })
        }
        onCollapse={() => setShowNowPlaying(false)}
        onTogglePlayPause={() => player.togglePlayPause(activePlaybackFallbackList)}
        onPrevious={player.playPrevious}
        onNext={player.playNext}
        onSeek={player.seekTo}
        onToggleShuffle={player.toggleShuffle}
        onCycleRepeat={player.cycleRepeat}
        onOpenArtworkEditor={openAlbumArtEditor}
        onMarkArtworkBroken={markArtworkCorrupted}
        onOpenEqualizer={() => {
          player.ensureWebAudioGraph();
          setShowEqualizer(true);
        }}
      />

      {/* Full-Screen Settings View */}
      <SettingsView
        isOpen={showSettings}
        settings={settings}
        trackCount={tracks.length}
        playlistCount={playlists.length}
        onChangeSettings={handleSettingsChange}
        onOpenEqualizer={() => {
          player.ensureWebAudioGraph();
          setShowEqualizer(true);
        }}
        onImportFiles={() => fileInputRef.current?.click()}
        onImportFolder={() => folderInputRef.current?.click()}
        onClearLibrary={() => void handleClearLibrary()}
        onClose={() => setShowSettings(false)}
      />

      {/* Slide-Up 5-Band Equalizer Panel */}
      <HoloEqualizerPanel
        isOpen={showEqualizer}
        equalizer={equalizer}
        onChange={handleEqualizerChange}
        onClose={() => setShowEqualizer(false)}
        onUserInteract={player.ensureWebAudioGraph}
      />

      {/* Dialogs */}
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

      <HoloAlbumArtDialog
        track={editingArtState?.track || null}
        allTracks={tracks}
        isCorrupted={editingArtState?.isCorrupted}
        onSaveArtwork={(track, artworkDataUrl, applyToAlbum) =>
          void handleSaveArtwork(track, artworkDataUrl, applyToAlbum)
        }
        onClose={() => setEditingArtState(null)}
      />
    </div>
  );
}
