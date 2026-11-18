import { useRef, useState, type CSSProperties } from 'react';
import type { EqPresetName, EqualizerState } from '../types/music';
import { EQ_BANDS, EQ_PRESET_ORDER, EQ_PRESET_VALUES } from '../utils/equalizerPresets';
import { HoloCloseIcon, HoloEqualizerIcon } from './HoloIcons';

interface HoloEqualizerPanelProps {
  isOpen: boolean;
  equalizer: EqualizerState;
  onChange: (next: EqualizerState) => void;
  onClose: () => void;
  onUserInteract: () => void;
}

interface VerticalHoloSliderProps {
  label: string;
  valueDb: number;
  disabled: boolean;
  onChangeDb: (val: number) => void;
  onInteract: () => void;
}

function VerticalHoloFader({
  label,
  valueDb,
  disabled,
  onChangeDb,
  onInteract,
}: VerticalHoloSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const db = Math.round((clampedRatio * 24 - 12) * 2) / 2;
    onInteract();
    onChangeDb(db);
  };

  const percent = ((valueDb + 12) / 24) * 100;
  const zeroPercent = 50;
  const fillBottom = Math.min(percent, zeroPercent);
  const fillHeight = Math.abs(percent - zeroPercent);

  return (
    <div className="flex select-none flex-col items-center gap-2">
      <span
        className={`font-mono text-[11px] tabular-nums ${
          disabled ? 'text-[var(--text-dim)]' : 'text-[var(--accent)]'
        }`}
      >
        {valueDb > 0 ? `+${valueDb}` : `${valueDb}`}dB
      </span>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} band gain`}
        aria-valuemin={-12}
        aria-valuemax={12}
        aria-valuenow={valueDb}
        aria-disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromClientY(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging || disabled) return;
          updateFromClientY(e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onInteract();
            onChangeDb(Math.min(12, valueDb + 1));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onInteract();
            onChangeDb(Math.max(-12, valueDb - 1));
          }
        }}
        className={`relative flex h-36 w-11 touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
          disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
        }`}
      >
        {/* Recessed Track */}
        <div
          className="relative h-full w-[5px]"
          style={{
            backgroundColor: 'var(--seek-track-bg)',
            boxShadow: 'var(--seek-track-shadow)',
          }}
        >
          {/* 0dB Center Tick */}
          <div className="absolute left-[-6px] right-[-6px] top-1/2 h-px -translate-y-1/2 bg-[var(--divider-strong)]" />

          {/* Active Segment from 0dB */}
          <div
            className="absolute left-0 right-0 transition-[bottom,height] duration-75"
            style={{
              bottom: `${fillBottom}%`,
              height: `${Math.max(fillHeight, 1)}%`,
              background: disabled ? 'var(--text-dim)' : 'var(--accent)',
              boxShadow: disabled ? 'none' : '0 0 8px var(--accent-glow)',
            }}
          />
        </div>

        {/* Theme Scrubber Thumb */}
        <div
          className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full transition-[bottom,box-shadow] duration-75"
          style={{
            bottom: `${percent}%`,
            background: disabled ? 'var(--text-dim)' : 'var(--seek-thumb-bg)',
            border: '1px solid var(--seek-thumb-border)',
            boxShadow: disabled ? 'none' : 'var(--seek-thumb-shadow)',
          }}
        />
      </div>

      <span className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}

export function HoloEqualizerPanel({
  isOpen,
  equalizer,
  onChange,
  onClose,
  onUserInteract,
}: HoloEqualizerPanelProps) {
  if (!isOpen) return null;

  const handleToggle = () => {
    onUserInteract();
    onChange({
      ...equalizer,
      enabled: !equalizer.enabled,
    });
  };

  const handlePresetChange = (preset: EqPresetName) => {
    if (preset === 'Custom') return;
    onUserInteract();
    onChange({
      ...equalizer,
      preset,
      bands: [...EQ_PRESET_VALUES[preset]],
    });
  };

  const handleBandChange = (index: number, dbValue: number) => {
    const nextBands: [number, number, number, number, number] = [...equalizer.bands] as [
      number,
      number,
      number,
      number,
      number,
    ];
    nextBands[index] = dbValue;
    onChange({
      ...equalizer,
      preset: 'Custom',
      bands: nextBands,
    });
  };

  const handleBassBoostChange = (value: number) => {
    onUserInteract();
    onChange({
      ...equalizer,
      bassBoost: value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="5-Band Equalizer"
    >
      <div
        className="holo-dialog-surface w-full max-w-2xl overflow-hidden"
        style={{ borderTop: '2px solid var(--accent)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="holo-actionbar-surface flex items-center justify-between border-b border-[var(--divider)] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <HoloEqualizerIcon className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--accent)]">Equalizer</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                5-Band Audio · {equalizer.preset}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggle}
              aria-pressed={equalizer.enabled}
              className="flex h-9 items-center border p-[2px]"
              style={{
                backgroundColor: 'var(--rocker-bg)',
                borderColor: 'var(--divider-strong)',
                borderRadius: 'var(--control-radius)',
              }}
            >
              <span
                className="px-2.5 py-1 text-[11px] font-bold tracking-wider"
                style={
                  !equalizer.enabled
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
                className="px-2.5 py-1 text-[11px] font-bold tracking-wider"
                style={
                  equalizer.enabled
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

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Equalizer"
              className="holo-btn flex h-9 w-9 items-center justify-center"
            >
              <HoloCloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preset Selector & 5-Band Sliders */}
        <div className="holo-bg-gradient px-4 py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--divider)] pb-3">
            <label
              htmlFor="holo-eq-preset"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Preset
            </label>
            <div className="flex items-center gap-2">
              <select
                id="holo-eq-preset"
                value={equalizer.preset}
                disabled={!equalizer.enabled}
                onChange={(e) => handlePresetChange(e.target.value as EqPresetName)}
                className="holo-btn min-w-[165px] px-3 py-1.5 text-sm font-medium text-[var(--accent)] focus:outline-none disabled:opacity-50"
              >
                {EQ_PRESET_ORDER.map((presetName) => (
                  <option key={presetName} value={presetName}>
                    {presetName}
                  </option>
                ))}
                {equalizer.preset === 'Custom' && <option value="Custom">Custom</option>}
              </select>

              <button
                type="button"
                disabled={!equalizer.enabled}
                onClick={() => handlePresetChange('Flat')}
                className="holo-btn px-3 py-1.5 text-xs font-semibold disabled:opacity-45"
              >
                Flatten
              </button>
            </div>
          </div>

          {/* 5 Vertical Sliders */}
          <div className="grid grid-cols-5 gap-2 border-b border-[var(--divider)] pb-4">
            {EQ_BANDS.map((band, idx) => (
              <VerticalHoloFader
                key={band.frequency}
                label={band.label}
                valueDb={equalizer.bands[idx]}
                disabled={!equalizer.enabled}
                onChangeDb={(val) => handleBandChange(idx, val)}
                onInteract={onUserInteract}
              />
            ))}
          </div>

          {/* Bass Boost Control */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="holo-bass-boost"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
              >
                Bass Boost
              </label>
              <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
                {equalizer.enabled
                  ? `${equalizer.bassBoost}% (+${((equalizer.bassBoost / 100) * 12).toFixed(1)} dB)`
                  : 'Bypassed'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--text-dim)]">0%</span>
              <input
                id="holo-bass-boost"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!equalizer.enabled}
                value={equalizer.bassBoost}
                onChange={(e) => handleBassBoostChange(Number(e.target.value))}
                className="holo-seekbar flex-1 disabled:opacity-45"
                style={
                  {
                    '--seek-pct': `${equalizer.bassBoost}%`,
                    '--seek-color': equalizer.enabled ? 'var(--accent)' : 'var(--text-dim)',
                  } as CSSProperties
                }
              />
              <span className="font-mono text-[11px] text-[var(--text-dim)]">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
