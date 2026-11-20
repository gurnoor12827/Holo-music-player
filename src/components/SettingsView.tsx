import { useState } from 'react';
import type {
  AppSettings,
  AppThemeId,
  ReverbPreset,
  SortMode,
  VisualizerMode,
} from '../types/music';
import { formatTime } from '../utils/audioMetadata';
import { THEME_OPTIONS } from '../utils/themeConfig';
import { VISUALIZER_MODES } from './AudioVisualizer';
import { HoloBackIcon } from './HoloIcons';

interface SettingsViewProps {
  isOpen: boolean;
  settings: AppSettings;
  trackCount: number;
  playlistCount: number;
  sleepTimerMinutes: number;
  sleepTimerRemainingSec: number | null;
  onSetSleepTimer: (minutes: number) => void;
  onChangeSettings: (next: AppSettings) => void;
  onOpenEqualizer: () => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onClearLibrary: () => void;
  onClose: () => void;
}

const SORT_MODES: { value: SortMode; label: string }[] = [
  { value: 'title', label: 'Title (A - Z)' },
  { value: 'artist', label: 'Artist (A - Z)' },
  { value: 'album', label: 'Album (A - Z)' },
  { value: 'duration', label: 'Duration (Longest)' },
  { value: 'added', label: 'Recently Added' },
];

const CROSSFADE_DURATIONS = [2, 4, 6];
const SLEEP_TIMER_OPTIONS: number[] = [0, 15, 30, 45, 60];

const REVERB_PRESETS: { value: ReverbPreset; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'small_room', label: 'Small Room' },
  { value: 'medium_hall', label: 'Medium Hall' },
  { value: 'large_hall', label: 'Large Hall' },
  { value: 'plate', label: 'Studio Plate' },
];

export function SettingsView({
  isOpen,
  settings,
  trackCount,
  playlistCount,
  sleepTimerMinutes,
  sleepTimerRemainingSec,
  onSetSleepTimer,
  onChangeSettings,
  onOpenEqualizer,
  onImportFiles,
  onImportFolder,
  onClearLibrary,
  onClose,
}: SettingsViewProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const setTheme = (theme: AppThemeId) => {
    onChangeSettings({ ...settings, theme });
  };

  const crossfadeEnabled = settings.crossfadeSeconds > 0;

  return (
    <section
      aria-label="Settings"
      className="holo-bg-gradient fixed inset-0 z-40 flex flex-col overflow-hidden"
    >
      {/* Top Action Bar */}
      <header className="holo-actionbar-surface flex h-13 shrink-0 items-center gap-2 px-2 sm:px-4">
        <button
          type="button"
          onClick={() => {
            setConfirmClear(false);
            onClose();
          }}
          aria-label="Back to Library"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
        >
          <HoloBackIcon className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Settings</h2>
      </header>

      {/* Settings List */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="holo-scroll holo-track-scroll">
          <div className="w-full pb-8">
            {/* Theme Switcher */}
            <div className="holo-subheader-surface px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Theme
            </div>

            <div role="radiogroup" aria-label="App Theme">
              {THEME_OPTIONS.map((opt) => {
                const selected = settings.theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(opt.id)}
                    className={`holo-list-row flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left ${
                      selected ? 'holo-list-row-active' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 overflow-hidden border border-[var(--divider-strong)]"
                        style={{ borderRadius: 'var(--card-radius)' }}
                        aria-hidden="true"
                      >
                        <span className="flex-1" style={{ backgroundColor: opt.swatches[0] }} />
                        <span className="flex-1" style={{ backgroundColor: opt.swatches[1] }} />
                        <span className="flex-1" style={{ backgroundColor: opt.swatches[2] }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-semibold ${
                            selected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          {opt.summary}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-[var(--accent)]'
                          : 'border-[var(--divider-strong)]'
                      }`}
                    >
                      {selected && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
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

            {/* Playback & Display */}
            <div className="holo-subheader-surface mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Playback and Library
            </div>

            <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
              <div>
                <label
                  htmlFor="settings-default-sort"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Default Track Sort
                </label>
                <span className="text-xs text-[var(--text-secondary)]">
                  Applied to track lists on startup
                </span>
              </div>
              <select
                id="settings-default-sort"
                value={settings.defaultSort}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    defaultSort: e.target.value as SortMode,
                  })
                }
                className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] focus:outline-none"
              >
                {SORT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Show Track Thumbnails
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Display album art icons in track lists
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.showListArtwork}
                onClick={() =>
                  onChangeSettings({
                    ...settings,
                    showListArtwork: !settings.showListArtwork,
                  })
                }
                className="flex min-h-[40px] items-center border p-[2px]"
                style={{
                  backgroundColor: 'var(--rocker-bg)',
                  borderColor: 'var(--divider-strong)',
                  borderRadius: 'var(--control-radius)',
                }}
              >
                <span
                  className="px-2.5 py-1 text-[11px] font-bold"
                  style={
                    !settings.showListArtwork
                      ? {
                          backgroundColor: 'var(--rocker-off-bg)',
                          color: 'var(--rocker-off-text)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  OFF
                </span>
                <span
                  className="px-2.5 py-1 text-[11px] font-bold"
                  style={
                    settings.showListArtwork
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--rocker-on-text)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  ON
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEqualizer();
              }}
              className="holo-list-row flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  5-Band Equalizer
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Adjust frequency bands and bass boost
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--accent)]">Open</span>
            </button>

            {/* Sleep Timer */}
            <div className="holo-list-row flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Sleep Timer
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Automatically fade out and pause playback
                  </div>
                </div>
                {sleepTimerRemainingSec !== null && (
                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
                    {formatTime(sleepTimerRemainingSec)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {SLEEP_TIMER_OPTIONS.map((mins) => {
                  const active = sleepTimerMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onSetSleepTimer(mins)}
                      className={`min-h-[38px] px-2 py-1.5 font-mono text-xs font-semibold ${
                        active
                          ? 'holo-btn-primary'
                          : 'holo-btn text-[var(--text-secondary)]'
                      }`}
                    >
                      {mins === 0 ? 'Off' : `${mins}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Effects & Gestures */}
            <div className="holo-subheader-surface mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Audio Effects and Gestures
            </div>

            <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Shake to Skip
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Shake device to skip to the next track
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.shakeToSkip}
                onClick={async () => {
                  const nextVal = !settings.shakeToSkip;
                  if (nextVal && typeof DeviceMotionEvent !== 'undefined') {
                    const reqPerm = (
                      DeviceMotionEvent as unknown as {
                        requestPermission?: () => Promise<'granted' | 'denied'>;
                      }
                    ).requestPermission;
                    if (typeof reqPerm === 'function') {
                      try {
                        const res = await reqPerm();
                        if (res !== 'granted') return;
                      } catch {
                        return;
                      }
                    }
                  }
                  onChangeSettings({
                    ...settings,
                    shakeToSkip: nextVal,
                  });
                }}
                className="flex min-h-[40px] items-center border p-[2px]"
                style={{
                  backgroundColor: 'var(--rocker-bg)',
                  borderColor: 'var(--divider-strong)',
                  borderRadius: 'var(--control-radius)',
                }}
              >
                <span
                  className="px-2.5 py-1 text-[11px] font-bold"
                  style={
                    !settings.shakeToSkip
                      ? {
                          backgroundColor: 'var(--rocker-off-bg)',
                          color: 'var(--rocker-off-text)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  OFF
                </span>
                <span
                  className="px-2.5 py-1 text-[11px] font-bold"
                  style={
                    settings.shakeToSkip
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--rocker-on-text)',
                        }
                      : { color: 'var(--text-dim)' }
                  }
                >
                  ON
                </span>
              </button>
            </div>

            {/* Audio Crossfade Toggle + Duration Selector */}
            <div className="holo-list-row flex flex-col gap-2.5 px-4 py-3">
              <div className="flex min-h-[44px] items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Audio Crossfade
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Smoothly fade between tracks at playback boundaries
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Toggle Audio Crossfade"
                  aria-checked={crossfadeEnabled}
                  onClick={() =>
                    onChangeSettings({
                      ...settings,
                      crossfadeSeconds: crossfadeEnabled ? 0 : 4,
                    })
                  }
                  className="flex min-h-[40px] items-center border p-[2px]"
                  style={{
                    backgroundColor: 'var(--rocker-bg)',
                    borderColor: 'var(--divider-strong)',
                    borderRadius: 'var(--control-radius)',
                  }}
                >
                  <span
                    className="px-2.5 py-1 text-[11px] font-bold"
                    style={
                      !crossfadeEnabled
                        ? {
                            backgroundColor: 'var(--rocker-off-bg)',
                            color: 'var(--rocker-off-text)',
                          }
                        : { color: 'var(--text-dim)' }
                    }
                  >
                    OFF
                  </span>
                  <span
                    className="px-2.5 py-1 text-[11px] font-bold"
                    style={
                      crossfadeEnabled
                        ? {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--rocker-on-text)',
                          }
                        : { color: 'var(--text-dim)' }
                    }
                  >
                    ON
                  </span>
                </button>
              </div>

              {crossfadeEnabled && (
                <div className="grid grid-cols-3 gap-1.5">
                  {CROSSFADE_DURATIONS.map((sec) => {
                    const active = settings.crossfadeSeconds === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          onChangeSettings({
                            ...settings,
                            crossfadeSeconds: sec,
                          })
                        }
                        className={`min-h-[36px] px-2 py-1 font-mono text-xs font-semibold ${
                          active
                            ? 'holo-btn-primary'
                            : 'holo-btn text-[var(--text-secondary)]'
                        }`}
                      >
                        {sec} sec
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
              <div>
                <label
                  htmlFor="settings-reverb"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Reverb Preset
                </label>
                <span className="text-xs text-[var(--text-secondary)]">
                  Acoustic space convolution processing
                </span>
              </div>
              <select
                id="settings-reverb"
                value={settings.reverbPreset}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    reverbPreset: e.target.value as ReverbPreset,
                  })
                }
                className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] focus:outline-none"
              >
                {REVERB_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
              <div>
                <label
                  htmlFor="settings-visualizer"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Visualizer Mode
                </label>
                <span className="text-xs text-[var(--text-secondary)]">
                  Theme-matched display in Now Playing
                </span>
              </div>
              <select
                id="settings-visualizer"
                value={settings.visualizerMode}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    visualizerMode: e.target.value as VisualizerMode,
                  })
                }
                className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] focus:outline-none"
              >
                {VISUALIZER_MODES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Storage Actions */}
            <div className="holo-subheader-surface mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Storage
            </div>

            <div className="holo-list-row flex min-h-[56px] flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Import Local Audio
                </div>
                <div className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                  {trackCount} {trackCount === 1 ? 'track' : 'tracks'} · {playlistCount}{' '}
                  {playlistCount === 1 ? 'playlist' : 'playlists'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onImportFiles}
                  className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold"
                >
                  Add Files
                </button>
                <button
                  type="button"
                  onClick={onImportFolder}
                  className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold"
                >
                  Add Folder
                </button>
              </div>
            </div>

            {trackCount > 0 && (
              <div className="holo-list-row flex min-h-[56px] items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[var(--danger-text)]">
                    Clear Saved Library
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Remove all cached tracks from IndexedDB
                  </div>
                </div>
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmClear(false);
                        onClearLibrary();
                      }}
                      className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold text-[var(--danger-text)]"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="holo-btn min-h-[40px] px-3 py-1.5 text-xs font-semibold text-[var(--danger-text)]"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* About v1.0 */}
            <div className="holo-subheader-surface mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              About
            </div>

            <div className="holo-list-row flex min-h-[52px] items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Holo Player
              </div>
              <div className="font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
                v1.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
