import type { EqPresetName, EqualizerState } from '../types/music';

export interface EqBandDefinition {
  frequency: number;
  label: string;
  q: number;
}

export const EQ_BANDS: EqBandDefinition[] = [
  { frequency: 60, label: '60Hz', q: 1.0 },
  { frequency: 230, label: '230Hz', q: 1.1 },
  { frequency: 910, label: '910Hz', q: 1.1 },
  { frequency: 3600, label: '3.6kHz', q: 1.1 },
  { frequency: 14000, label: '14kHz', q: 1.0 },
];

export const EQ_PRESET_ORDER: Exclude<EqPresetName, 'Custom'>[] = [
  'Normal',
  'Classical',
  'Dance',
  'Flat',
  'Folk',
  'Heavy Metal',
  'Hip Hop',
  'Jazz',
  'Pop',
  'Rock',
];

/**
 * Classic Android 4.4 KitKat MusicFX 5-band dB curves (-12 dB to +12 dB)
 */
export const EQ_PRESET_VALUES: Record<
  Exclude<EqPresetName, 'Custom'>,
  [number, number, number, number, number]
> = {
  Normal: [3, 0, 0, 0, 3],
  Classical: [5, 3, -2, 4, 4],
  Dance: [6, 0, 2, 4, 1],
  Flat: [0, 0, 0, 0, 0],
  Folk: [3, 0, 0, 2, -1],
  'Heavy Metal': [4, 1, 9, 3, 0],
  'Hip Hop': [5, 3, 0, 1, 3],
  Jazz: [4, 2, -2, 2, 5],
  Pop: [-1, 2, 5, 1, -2],
  Rock: [5, 3, -1, 3, 5],
};

export const DEFAULT_EQUALIZER_STATE: EqualizerState = {
  enabled: true,
  preset: 'Normal',
  bands: [...EQ_PRESET_VALUES.Normal],
  bassBoost: 25,
};
