import type { EqualizerState, PlaylistRecord, TrackRecord } from '../types/music';
import { DEFAULT_EQUALIZER_STATE } from './equalizerPresets';

const DB_NAME = 'holo-music-db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

const EQ_STORAGE_KEY = 'holo_music_eq_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

export async function loadAllTracks(): Promise<TrackRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result as TrackRecord[]) || []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to read tracks from IndexedDB.'));
    };
  });
}

export async function saveTracks(tracks: TrackRecord[]): Promise<void> {
  if (tracks.length === 0) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    for (const track of tracks) {
      store.put(track);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save tracks to IndexedDB.'));
    };
  });
}

export async function deleteTrackFromDb(trackId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to remove track from IndexedDB.'));
    };
  });
}

export async function clearAllTracksFromDb(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    tx.objectStore(STORE_TRACKS).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to clear library from IndexedDB.'));
    };
  });
}

const PLAYLIST_BACKUP_KEY = 'holo_music_playlists_v1';

function syncPlaylistsToLocalStorage(playlists: PlaylistRecord[]): void {
  try {
    localStorage.setItem(PLAYLIST_BACKUP_KEY, JSON.stringify(playlists));
  } catch {
    // ignore storage quota errors
  }
}

function readPlaylistsBackup(): PlaylistRecord[] {
  try {
    const raw = localStorage.getItem(PLAYLIST_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlaylistRecord[]) : [];
  } catch {
    return [];
  }
}

export async function loadAllPlaylists(): Promise<PlaylistRecord[]> {
  try {
    const db = await openDb();
    const idbRows = await new Promise<PlaylistRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
      const req = tx.objectStore(STORE_PLAYLISTS).getAll();
      req.onsuccess = () => {
        db.close();
        const rows = (req.result as PlaylistRecord[]) || [];
        rows.sort((a, b) => a.createdAt - b.createdAt);
        resolve(rows);
      };
      req.onerror = () => {
        db.close();
        reject(req.error || new Error('Failed to read playlists from IndexedDB.'));
      };
    });
    if (idbRows.length > 0) {
      syncPlaylistsToLocalStorage(idbRows);
      return idbRows;
    }
    const backup = readPlaylistsBackup();
    if (backup.length > 0) {
      for (const pl of backup) {
        await savePlaylist(pl);
      }
      return backup.sort((a, b) => a.createdAt - b.createdAt);
    }
    return idbRows;
  } catch {
    return readPlaylistsBackup().sort((a, b) => a.createdAt - b.createdAt);
  }
}

export async function savePlaylist(playlist: PlaylistRecord): Promise<void> {
  const backup = readPlaylistsBackup().filter((p) => p.id !== playlist.id);
  backup.push(playlist);
  backup.sort((a, b) => a.createdAt - b.createdAt);
  syncPlaylistsToLocalStorage(backup);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).put(playlist);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save playlist to IndexedDB.'));
    };
  });
}

export async function deletePlaylistFromDb(playlistId: string): Promise<void> {
  const backup = readPlaylistsBackup().filter((p) => p.id !== playlistId);
  syncPlaylistsToLocalStorage(backup);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).delete(playlistId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to delete playlist from IndexedDB.'));
    };
  });
}

export function loadEqualizerState(): EqualizerState {
  try {
    const raw = localStorage.getItem(EQ_STORAGE_KEY);
    if (!raw) return DEFAULT_EQUALIZER_STATE;
    const parsed = JSON.parse(raw) as Partial<EqualizerState>;
    if (
      typeof parsed.enabled === 'boolean' &&
      Array.isArray(parsed.bands) &&
      parsed.bands.length === 5 &&
      typeof parsed.bassBoost === 'number'
    ) {
      return {
        enabled: parsed.enabled,
        preset: parsed.preset || 'Custom',
        bands: [
          clampBand(parsed.bands[0]),
          clampBand(parsed.bands[1]),
          clampBand(parsed.bands[2]),
          clampBand(parsed.bands[3]),
          clampBand(parsed.bands[4]),
        ],
        bassBoost: Math.max(0, Math.min(100, parsed.bassBoost)),
      };
    }
  } catch {
    // fallback below
  }
  return DEFAULT_EQUALIZER_STATE;
}

export function saveEqualizerState(state: EqualizerState): void {
  try {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function clampBand(val: unknown): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return Math.max(-12, Math.min(12, val));
}
