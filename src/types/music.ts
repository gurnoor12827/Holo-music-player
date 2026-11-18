export type TabId = 'songs' | 'artists' | 'albums' | 'playlists';

export type SortMode = 'title' | 'artist' | 'album' | 'duration' | 'added';

export type RepeatMode = 'off' | 'all' | 'one';

export type AppThemeId = 'holo' | 'aero' | 'skeuomorphic';

export interface AppSettings {
  theme: AppThemeId;
  defaultSort: SortMode;
  showListArtwork: boolean;
}

export type EqPresetName =
  | 'Normal'
  | 'Classical'
  | 'Dance'
  | 'Flat'
  | 'Folk'
  | 'Heavy Metal'
  | 'Hip Hop'
  | 'Jazz'
  | 'Pop'
  | 'Rock'
  | 'Custom';

export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  artworkDataUrl: string | null;
  addedAt: number;
  blob: Blob;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EqualizerState {
  enabled: boolean;
  preset: EqPresetName;
  /** Gain in dB (-12 to +12) for [60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz] */
  bands: [number, number, number, number, number];
  /** Bass boost intensity from 0 to 100 */
  bassBoost: number;
}
