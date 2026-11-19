import type { AppSettings, AppThemeId } from '../types/music';

export interface ThemeDefinition {
  id: AppThemeId;
  label: string;
  summary: string;
  swatches: [string, string, string];
}

export const THEME_OPTIONS: ThemeDefinition[] = [
  {
    id: 'holo',
    label: 'Android Holo',
    summary: 'Dark #000000/#111111 surfaces, 1px dividers, flat tabs, #33B5E5 cyan',
    swatches: ['#000000', '#181818', '#33B5E5'],
  },
  {
    id: 'aero',
    label: 'Frutiger Aero',
    summary: 'Glossy sky-to-aqua #0078D7/#5CE65C gradients, white inner highlights, gel buttons',
    swatches: ['#EAF7FD', '#0078D7', '#5CE65C'],
  },
  {
    id: 'skeuomorphic',
    label: 'Skeuomorphic',
    summary: 'Brushed dark metal, recessed groove track, 3D beveled controls, #FF9F1C amber LED',
    swatches: ['#1F2227', '#353941', '#FF9F1C'],
  },
];

const SETTINGS_STORAGE_KEY = 'holo_music_settings_v1';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'holo',
  defaultSort: 'title',
  showListArtwork: true,
  shakeToSkip: false,
  crossfadeSeconds: 0,
  reverbPreset: 'none',
  visualizerMode: 'water_reflex',
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const theme: AppThemeId =
      parsed.theme === 'aero' || parsed.theme === 'skeuomorphic' ? parsed.theme : 'holo';
    const defaultSort =
      parsed.defaultSort === 'artist' ||
      parsed.defaultSort === 'album' ||
      parsed.defaultSort === 'duration' ||
      parsed.defaultSort === 'added'
        ? parsed.defaultSort
        : 'title';
    const crossfadeSeconds =
      parsed.crossfadeSeconds === 2 ||
      parsed.crossfadeSeconds === 4 ||
      parsed.crossfadeSeconds === 6
        ? parsed.crossfadeSeconds
        : 0;
    const reverbPreset =
      parsed.reverbPreset === 'small_room' ||
      parsed.reverbPreset === 'medium_hall' ||
      parsed.reverbPreset === 'large_hall' ||
      parsed.reverbPreset === 'plate'
        ? parsed.reverbPreset
        : 'none';
    const visualizerMode =
      parsed.visualizerMode === 'led_bars' ||
      parsed.visualizerMode === 'octave_bars' ||
      parsed.visualizerMode === 'mirror_wave' ||
      parsed.visualizerMode === 'radial' ||
      parsed.visualizerMode === 'line_area'
        ? parsed.visualizerMode
        : 'water_reflex';
    return {
      theme,
      defaultSort,
      showListArtwork: parsed.showListArtwork !== false,
      shakeToSkip: parsed.shakeToSkip === true,
      crossfadeSeconds,
      reverbPreset,
      visualizerMode,
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}

export function applyDocumentTheme(themeId: AppThemeId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = themeId;
  }
}
