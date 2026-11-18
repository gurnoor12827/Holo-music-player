import { useState } from 'react';
import type { AppSettings, AppThemeId, SortMode } from '../types/music';
import { THEME_OPTIONS } from '../utils/themeConfig';
import { HoloBackIcon } from './HoloIcons';

interface SettingsViewProps {
  isOpen: boolean;
  settings: AppSettings;
  trackCount: number;
  playlistCount: number;
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

export function SettingsView({
  isOpen,
  settings,
  trackCount,
  playlistCount,
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
      <div className="holo-scroll flex-1 overflow-y-auto">
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
                      style={{ borderRadius: 'var(--control-radius)' }}
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
              <div className="text-sm font-medium text-[var(--text-primary)]">5-Band Equalizer</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Adjust frequency bands and bass boost
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--accent)]">Open</span>
          </button>

          {/* Storage Actions */}
          <div className="holo-subheader-surface mt-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
            Storage
          </div>

          <div className="holo-list-row flex min-h-[56px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Import Local Audio</div>
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
        </div>
      </div>
    </section>
  );
}
