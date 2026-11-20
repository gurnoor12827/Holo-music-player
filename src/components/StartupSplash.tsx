import { useEffect, useMemo, useState } from 'react';
import type { AppThemeId } from '../types/music';

interface StartupSplashProps {
  theme: AppThemeId;
  isIndexing: boolean;
  minDisplayMs?: number;
}

interface SplashPalette {
  primary: string;
  secondary: string;
  highlight: string;
  track: string;
  glow: string;
}

const SPLASH_PALETTES: Record<AppThemeId, SplashPalette> = {
  holo: {
    primary: '#33B5E5',
    secondary: '#0099CC',
    highlight: '#8CE0FF',
    track: 'rgba(51, 181, 229, 0.14)',
    glow: 'rgba(51, 181, 229, 0.36)',
  },
  aero: {
    primary: '#00C4FF',
    secondary: '#0078D7',
    highlight: '#7CEEFF',
    track: 'rgba(0, 196, 255, 0.16)',
    glow: 'rgba(0, 196, 255, 0.42)',
  },
  skeuomorphic: {
    primary: '#FF9F1C',
    secondary: '#D97706',
    highlight: '#FFE096',
    track: 'rgba(255, 159, 28, 0.15)',
    glow: 'rgba(255, 159, 28, 0.4)',
  },
};

export function StartupSplash({
  theme,
  isIndexing,
  minDisplayMs = 950,
}: StartupSplashProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  const palette = useMemo(() => SPLASH_PALETTES[theme] || SPLASH_PALETTES.holo, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayMs);
    return () => window.clearTimeout(timer);
  }, [minDisplayMs]);

  useEffect(() => {
    if (!isIndexing && minTimeElapsed && !fadingOut) {
      setFadingOut(true);
    }
  }, [isIndexing, minTimeElapsed, fadingOut]);

  useEffect(() => {
    if (!fadingOut) return;
    const timer = window.setTimeout(() => {
      setUnmounted(true);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [fadingOut]);

  if (unmounted) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!fadingOut}
      aria-label="Loading local library"
      className={`splash-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black select-none ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className="relative flex h-44 w-44 items-center justify-center sm:h-48 sm:w-48"
        style={{
          filter: `drop-shadow(0 0 18px ${palette.glow})`,
        }}
      >
        {/* Subtle centered ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, ${palette.track} 0%, rgba(0, 0, 0, 0) 72%)`,
          }}
        />

        {/* Ring 1 (Outermost): Faint circular guide rail + sweeping twin arcs */}
        <svg
          viewBox="0 0 200 200"
          className="splash-ring-cw-slow absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={palette.track}
            strokeWidth="1.25"
          />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={palette.secondary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="138 138 56 220"
            opacity="0.82"
          />
        </svg>

        {/* Ring 2 (Outer-Mid): Crisp primary accent sweep counter-rotating */}
        <svg
          viewBox="0 0 200 200"
          className="splash-ring-ccw-med absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke={palette.track}
            strokeWidth="1"
          />
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            stroke={palette.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="124 88 64 152"
          />
        </svg>

        {/* Ring 3 (Inner-Mid): High-luminance highlight orbital arc */}
        <svg
          viewBox="0 0 200 200"
          className="splash-ring-cw-fast absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="48"
            fill="none"
            stroke={palette.highlight}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="96 68 44 94"
            opacity="0.95"
          />
        </svg>

        {/* Ring 4 (Core): Minimalist inner ring */}
        <svg
          viewBox="0 0 200 200"
          className="splash-ring-ccw-core absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="28"
            fill="none"
            stroke={palette.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="72 42 22 40"
            opacity="0.9"
          />
        </svg>

        <span className="sr-only">Indexing local tracks...</span>
      </div>
    </div>
  );
}
