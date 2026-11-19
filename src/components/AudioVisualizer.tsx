import { useEffect, useRef } from 'react';
import AudioMotionAnalyzer, { type Options } from 'audiomotion-analyzer';
import type { AppThemeId, VisualizerMode } from '../types/music';

interface AudioVisualizerProps {
  theme: AppThemeId;
  mode: VisualizerMode;
  getAudioMotionTarget: () => {
    audioCtx: AudioContext | null;
    sourceNode: AudioNode | null;
  };
}

export const VISUALIZER_MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'water_reflex', label: 'Water Reflex' },
  { id: 'led_bars', label: 'LED Bars' },
  { id: 'octave_bars', label: 'Octave' },
  { id: 'mirror_wave', label: 'Mirror' },
  { id: 'radial', label: 'Radial' },
  { id: 'line_area', label: 'Area Line' },
];

function getModeOptions(mode: VisualizerMode): Partial<Options> {
  switch (mode) {
    case 'led_bars':
      return {
        mode: 4,
        ledBars: true,
        lumiBars: false,
        radial: false,
        mirror: 0,
        reflexRatio: 0,
        reflexAlpha: 0,
        fillAlpha: 0.9,
        lineWidth: 0,
        barSpace: 0.25,
      };
    case 'octave_bars':
      return {
        mode: 3,
        ledBars: false,
        lumiBars: true,
        radial: false,
        mirror: 0,
        reflexRatio: 0,
        reflexAlpha: 0,
        fillAlpha: 0.8,
        lineWidth: 0,
        barSpace: 0.2,
      };
    case 'mirror_wave':
      return {
        mode: 6,
        ledBars: false,
        lumiBars: false,
        radial: false,
        mirror: 1,
        reflexRatio: 0.3,
        reflexAlpha: 0.25,
        reflexBright: 1.0,
        fillAlpha: 0.6,
        lineWidth: 1.5,
        barSpace: 0.15,
      };
    case 'radial':
      return {
        mode: 4,
        ledBars: false,
        lumiBars: false,
        radial: true,
        spinSpeed: 1.2,
        mirror: 0,
        reflexRatio: 0,
        reflexAlpha: 0,
        fillAlpha: 0.72,
        lineWidth: 1.5,
        barSpace: 0.2,
      };
    case 'line_area':
      return {
        mode: 10,
        ledBars: false,
        lumiBars: false,
        radial: false,
        mirror: 0,
        reflexRatio: 0,
        reflexAlpha: 0,
        fillAlpha: 0.28,
        lineWidth: 2.2,
        barSpace: 0.1,
      };
    case 'water_reflex':
    default:
      return {
        mode: 10,
        ledBars: false,
        lumiBars: false,
        radial: false,
        mirror: 0,
        reflexRatio: 0.44,
        reflexAlpha: 0.36,
        reflexBright: 1.0,
        fillAlpha: 0.52,
        lineWidth: 2,
        barSpace: 0.1,
      };
  }
}

export function AudioVisualizer({ theme, mode, getAudioMotionTarget }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { audioCtx, sourceNode } = getAudioMotionTarget();

    const analyzer = new AudioMotionAnalyzer(container, {
      audioCtx: audioCtx ?? undefined,
      source: sourceNode ?? undefined,
      connectSpeakers: false,
      overlay: true,
      showBgColor: true,
      bgAlpha: 1,
      showScaleX: false,
      showScaleY: false,
      showPeaks: true,
      smoothing: 0.72,
      fftSize: 4096,
      ...getModeOptions(mode),
    });

    analyzer.registerGradient('theme_holo', {
      bgColor: '#000000',
      colorStops: ['#005F80', '#0099CC', '#33B5E5', '#B8EEFF'],
    });
    analyzer.registerGradient('theme_aero', {
      bgColor: '#EAF8FF',
      colorStops: ['#005A9E', '#0078D7', '#19B88E', '#5CE65C'],
    });
    analyzer.registerGradient('theme_skeuomorphic', {
      bgColor: '#101215',
      colorStops: ['#8F4B00', '#E07A00', '#FF9F1C', '#FFD480'],
    });

    analyzer.gradient = `theme_${theme}`;
    analyzerRef.current = analyzer;

    return () => {
      analyzerRef.current = null;
      try {
        analyzer.destroy();
      } catch {
        // ignore cleanup errors if AudioContext already closed
      }
    };
  }, [getAudioMotionTarget]);

  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    analyzer.setOptions({
      ...getModeOptions(mode),
      gradient: `theme_${theme}`,
    });
  }, [theme, mode]);

  return (
    <div
      ref={containerRef}
      aria-label={`Audio visualizer: ${mode}`}
      className="h-full w-full overflow-hidden"
    />
  );
}
