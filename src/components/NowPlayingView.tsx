import { useState, type CSSProperties } from 'react';
import type { AppThemeId, RepeatMode, TrackRecord, VisualizerMode } from '../types/music';
import { formatTime } from '../utils/audioMetadata';
import { AudioVisualizer, VISUALIZER_MODES } from './AudioVisualizer';
import {
  HoloCloseIcon,
  HoloCollapseIcon,
  HoloEqualizerIcon,
  HoloImageEditIcon,
  HoloNextIcon,
  HoloPauseIcon,
  HoloPlayIcon,
  HoloPrevIcon,
  HoloRepeatIcon,
  HoloSettingsIcon,
  HoloShuffleIcon,
  HoloVinylIcon,
} from './HoloIcons';

interface NowPlayingViewProps {
  isOpen: boolean;
  theme: AppThemeId;
  visualizerMode: VisualizerMode;
  track: TrackRecord | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isArtworkBroken: boolean;
  queuePositionLabel: string | null;
  getAudioMotionTarget: () => {
    audioCtx: AudioContext | null;
    sourceNode: AudioNode | null;
  };
  onChangeVisualizerMode: (mode: VisualizerMode) => void;
  onCollapse: () => void;
  onTogglePlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenArtworkEditor: (track: TrackRecord) => void;
  onMarkArtworkBroken: (trackId: string) => void;
  onOpenEqualizer: () => void;
}

export function NowPlayingView({
  isOpen,
  theme,
  visualizerMode,
  track,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeat,
  isArtworkBroken,
  queuePositionLabel,
  getAudioMotionTarget,
  onChangeVisualizerMode,
  onCollapse,
  onTogglePlayPause,
  onPrevious,
  onNext,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onOpenArtworkEditor,
  onMarkArtworkBroken,
  onOpenEqualizer,
}: NowPlayingViewProps) {
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  if (!isOpen) return null;

  const effectiveDuration = duration > 0 ? duration : track?.durationSec || 0;
  const seekMax = effectiveDuration > 0 ? effectiveDuration : 1;
  const seekPct = seekMax > 0 ? Math.min(100, (currentTime / seekMax) * 100) : 0;
  const hasValidArt = Boolean(track?.artworkDataUrl) && !isArtworkBroken;

  return (
    <section
      aria-label="Now Playing"
      className="holo-bg-gradient fixed inset-0 z-40 flex flex-col overflow-hidden"
    >
      {/* Top Bar */}
      <header className="holo-actionbar-surface flex h-13 shrink-0 items-center justify-between px-2 sm:px-4">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse Now Playing"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)]"
        >
          <HoloCollapseIcon className="h-6 w-6" />
        </button>

        <div className="min-w-0 text-center">
          <h2 className="truncate text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            Now Playing
          </h2>
          {queuePositionLabel && (
            <div className="font-mono text-[11px] tabular-nums text-[var(--text-dim)]">
              {queuePositionLabel}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenEqualizer}
            aria-label="Open Equalizer"
            title="Equalizer"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <HoloEqualizerIcon className="h-5 w-5" />
          </button>
          {track && (
            <button
              type="button"
              onClick={() => onOpenArtworkEditor(track)}
              aria-label="Edit Album Art"
              title="Edit Album Art"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              <HoloImageEditIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="holo-scroll flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4">
        <div className="flex w-full max-w-md flex-col items-center">
          {/* Stage Area: Artwork OR audioMotion-analyzer Visualizer */}
          {showVisualizer ? (
            <div className="theme-artwork-box aspect-square w-full max-w-[300px] overflow-hidden sm:max-w-[336px]">
              <AudioVisualizer
                theme={theme}
                mode={visualizerMode}
                getAudioMotionTarget={getAudioMotionTarget}
              />
            </div>
          ) : (
            <button
              type="button"
              disabled={!track}
              onClick={() => {
                if (track) onOpenArtworkEditor(track);
              }}
              aria-label={track ? `Edit cover art for ${track.title}` : 'No album art'}
              className="theme-artwork-box group relative flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden sm:max-w-[336px] disabled:cursor-default"
            >
              {hasValidArt && track?.artworkDataUrl ? (
                <img
                  src={track.artworkDataUrl}
                  alt={`${track.album} cover`}
                  onError={() => onMarkArtworkBroken(track.id)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-[var(--accent)]">
                  <HoloVinylIcon className="h-28 w-28" />
                </div>
              )}
            </button>
          )}

          {/* Track Metadata */}
          <div className="mt-5 w-full text-center">
            <div className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {track ? track.title : 'No track selected'}
            </div>
            <div className="mt-1 truncate text-sm text-[var(--accent)]">
              {track
                ? `${track.artist} · ${track.album}`
                : 'Select a track from your library'}
            </div>
          </div>

          {/* Interactive Seekbar with Tabular Timestamps */}
          <div className="mt-6 w-full">
            <input
              type="range"
              aria-label="Now Playing Seekbar"
              min={0}
              max={seekMax}
              step={0.5}
              disabled={!track}
              value={Math.min(currentTime, seekMax)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="holo-seekbar disabled:opacity-40"
              style={
                {
                  '--seek-pct': `${seekPct}%`,
                  '--seek-color': 'var(--accent)',
                } as CSSProperties
              }
            />
            <div className="mt-0.5 flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-[var(--accent)]">{formatTime(currentTime)}</span>
              <span className="text-[var(--text-secondary)]">
                {formatTime(effectiveDuration)}
              </span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="mt-6 flex w-full items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Toggle Shuffle"
              aria-pressed={shuffle}
              title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
              onClick={onToggleShuffle}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center border ${
                shuffle
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
              style={{ borderRadius: 'var(--control-radius)' }}
            >
              <HoloShuffleIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Previous Track"
              onClick={onPrevious}
              className="holo-btn flex h-12 w-16 items-center justify-center"
            >
              <HoloPrevIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={onTogglePlayPause}
              className="holo-btn-primary flex h-14 w-20 items-center justify-center"
            >
              {isPlaying ? (
                <HoloPauseIcon className="h-7 w-7" />
              ) : (
                <HoloPlayIcon className="h-7 w-7" />
              )}
            </button>

            <button
              type="button"
              aria-label="Next Track"
              onClick={onNext}
              className="holo-btn flex h-12 w-16 items-center justify-center"
            >
              <HoloNextIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              aria-label="Cycle Repeat Mode"
              title={`Repeat: ${repeat}`}
              onClick={onCycleRepeat}
              className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center border ${
                repeat !== 'off'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-primary)]'
              }`}
              style={{ borderRadius: 'var(--control-radius)' }}
            >
              <HoloRepeatIcon className="h-5 w-5" />
              {repeat === 'one' && (
                <span className="absolute bottom-1 right-1 text-[9px] font-bold leading-none text-[var(--accent)]">
                  1
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-Right Corner Settings Icon (Stage Mode & Visualizer Presets) */}
      <div className="flex shrink-0 items-center justify-end px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={() => setShowDisplaySettings(true)}
          aria-label="Now Playing Display and Visualizer Settings"
          title="Display & Visualizer"
          className={`holo-btn flex h-10 w-10 items-center justify-center ${
            showVisualizer ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <HoloSettingsIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Hidden Display & Visualizer Settings Popover Dialog */}
      {showDisplaySettings && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/55 p-3 sm:items-center sm:justify-center"
          onClick={() => setShowDisplaySettings(false)}
        >
          <div
            role="dialog"
            aria-label="Display and Visualizer Settings"
            onClick={(e) => e.stopPropagation()}
            className="holo-dialog-surface w-full max-w-xs overflow-hidden"
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--accent)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--accent)]">Display & Visualizer</h3>
              <button
                type="button"
                onClick={() => setShowDisplaySettings(false)}
                aria-label="Close display settings"
                className="flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <HoloCloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Stage Mode
              </div>
              <div
                className="grid grid-cols-2 border border-[var(--divider-strong)]"
                style={{
                  backgroundColor: 'var(--rocker-bg)',
                  borderRadius: 'var(--control-radius)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowVisualizer(false)}
                  className="py-2 text-xs font-bold uppercase tracking-wider"
                  style={
                    !showVisualizer
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--rocker-on-text)',
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  Artwork
                </button>
                <button
                  type="button"
                  onClick={() => setShowVisualizer(true)}
                  className="border-l border-[var(--divider-strong)] py-2 text-xs font-bold uppercase tracking-wider"
                  style={
                    showVisualizer
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--rocker-on-text)',
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  Visualizer
                </button>
              </div>

              <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Visualizer Preset
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {VISUALIZER_MODES.map((m) => {
                  const active = visualizerMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChangeVisualizerMode(m.id);
                        setShowVisualizer(true);
                      }}
                      className={`py-2 text-xs font-semibold ${
                        active ? 'holo-btn-primary' : 'holo-btn text-[var(--text-secondary)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[var(--divider)]">
              <button
                type="button"
                onClick={() => setShowDisplaySettings(false)}
                className="w-full py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--surface-row-hover)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
