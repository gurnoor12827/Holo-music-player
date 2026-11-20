import { useEffect, useRef } from 'react';
import type { AppThemeId, VisualizerMode } from '../types/music';

interface AudioVisualizerProps {
  theme: AppThemeId;
  mode: VisualizerMode;
  isPlaying: boolean;
  getAnalyserNode: () => AnalyserNode | null;
}

export const VISUALIZER_MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'led_bars', label: 'Spectrum Bars' },
  { id: 'water_reflex', label: 'Water Reflex' },
  { id: 'octave_bars', label: 'Octave Studio' },
  { id: 'mirror_wave', label: 'Mirror Wave' },
  { id: 'radial', label: 'Radial Halo' },
  { id: 'line_area', label: 'Area Curve' },
];

interface ThemePalette {
  bgTop: string;
  bgBottom: string;
  barTop: string;
  barMid: string;
  barLow: string;
  reflectionTop: string;
  reflectionBottom: string;
  peakColor: string;
  baselineColor: string;
  gridColor: string;
  glowColor: string;
}

function getThemePalette(theme: AppThemeId): ThemePalette {
  switch (theme) {
    case 'aero':
      return {
        bgTop: 'rgba(232, 249, 255, 0.92)',
        bgBottom: 'rgba(202, 245, 232, 0.95)',
        barTop: 'rgba(92, 230, 92, 0.96)',
        barMid: 'rgba(0, 152, 224, 0.78)',
        barLow: 'rgba(0, 120, 215, 0.08)',
        reflectionTop: 'rgba(0, 120, 215, 0.34)',
        reflectionBottom: 'rgba(0, 120, 215, 0.0)',
        peakColor: '#005A9E',
        baselineColor: 'rgba(0, 120, 215, 0.38)',
        gridColor: 'rgba(0, 120, 215, 0.10)',
        glowColor: 'rgba(0, 150, 225, 0.35)',
      };
    case 'skeuomorphic':
      return {
        bgTop: '#0B0D10',
        bgBottom: '#16191F',
        barTop: 'rgba(255, 224, 150, 0.98)',
        barMid: 'rgba(255, 159, 28, 0.76)',
        barLow: 'rgba(255, 159, 28, 0.04)',
        reflectionTop: 'rgba(255, 159, 28, 0.30)',
        reflectionBottom: 'rgba(255, 159, 28, 0.0)',
        peakColor: '#FFE2A8',
        baselineColor: 'rgba(255, 159, 28, 0.36)',
        gridColor: 'rgba(255, 159, 28, 0.08)',
        glowColor: 'rgba(255, 159, 28, 0.42)',
      };
    case 'holo':
    default:
      return {
        bgTop: '#020508',
        bgBottom: '#071219',
        barTop: 'rgba(155, 236, 255, 0.98)',
        barMid: 'rgba(51, 181, 229, 0.68)',
        barLow: 'rgba(0, 153, 204, 0.03)',
        reflectionTop: 'rgba(51, 181, 229, 0.34)',
        reflectionBottom: 'rgba(51, 181, 229, 0.0)',
        peakColor: '#C4F2FF',
        baselineColor: 'rgba(51, 181, 229, 0.42)',
        gridColor: 'rgba(51, 181, 229, 0.11)',
        glowColor: 'rgba(51, 181, 229, 0.45)',
      };
  }
}

function drawRoundedTopBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h);
  if (h <= 0.5 || w <= 0.5) return;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawRoundedBottomBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h);
  if (h <= 0.5 || w <= 0.5) return;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.closePath();
}

export function AudioVisualizer({
  theme,
  mode,
  isPlaying,
  getAnalyserNode,
}: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ theme, mode, isPlaying, getAnalyserNode });
  propsRef.current = { theme, mode, isPlaying, getAnalyserNode };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 44;
    const smoothed = new Float32Array(BAR_COUNT);
    const peaks = new Float32Array(BAR_COUNT);
    const peakVel = new Float32Array(BAR_COUNT);
    const peakHold = new Float32Array(BAR_COUNT);

    let freqBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(1024));
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 200;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = Math.max(120, container.clientWidth);
      height = Math.max(100, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const {
        theme: curTheme,
        mode: curMode,
        isPlaying: active,
        getAnalyserNode: fetchAnalyser,
      } = propsRef.current;

      const palette = getThemePalette(curTheme);
      const analyser = fetchAnalyser();
      const binCount = analyser ? analyser.frequencyBinCount : 0;
      if (binCount > 0 && freqBuffer.length !== binCount) {
        freqBuffer = new Uint8Array(new ArrayBuffer(binCount));
      }
      if (analyser && active && binCount > 0) {
        analyser.getByteFrequencyData(freqBuffer);
      }

      // Sample logarithmically spaced frequency bands from AnalyserNode
      const minBin = 1;
      const maxBin = Math.max(minBin + BAR_COUNT, Math.floor(binCount * 0.72));
      for (let i = 0; i < BAR_COUNT; i++) {
        let target = 0;
        if (analyser && active && binCount > 0) {
          const f0 = i / BAR_COUNT;
          const f1 = (i + 1) / BAR_COUNT;
          const b0 = Math.floor(minBin * Math.pow(maxBin / minBin, f0));
          const b1 = Math.max(b0 + 1, Math.floor(minBin * Math.pow(maxBin / minBin, f1)));
          let sum = 0;
          let count = 0;
          for (let b = b0; b < b1 && b < binCount; b++) {
            sum += freqBuffer[b];
            count++;
          }
          const avg = count > 0 ? sum / (count * 255) : 0;
          // Slight high-shelf compensation so treble stays responsive alongside sub-bass
          const shelfBoost = 0.88 + (i / BAR_COUNT) * 0.34;
          target = Math.min(1, Math.pow(avg * shelfBoost, 1.05));
        }

        // Crisp asymmetric exponential smoothing (snappy rise, silk decay — zero jelly oscillation)
        const rate = target > smoothed[i] ? 22 : 9.5;
        const alpha = 1 - Math.exp(-rate * dt);
        smoothed[i] += (target - smoothed[i]) * alpha;
        if (smoothed[i] < 0.002) smoothed[i] = 0;

        // Smooth peak-decay gravity
        if (smoothed[i] >= peaks[i]) {
          peaks[i] = smoothed[i];
          peakVel[i] = 0;
          peakHold[i] = 0.18;
        } else if (peakHold[i] > 0) {
          peakHold[i] -= dt;
        } else {
          peakVel[i] += 2.4 * dt;
          peaks[i] = Math.max(smoothed[i], peaks[i] - peakVel[i] * dt);
        }
      }

      // Clear & paint clean surface backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, palette.bgTop);
      bgGrad.addColorStop(1, palette.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle reference grid
      ctx.strokeStyle = palette.gridColor;
      ctx.lineWidth = 1;
      for (let g = 1; g <= 3; g++) {
        const gy = Math.round((height * 0.72 * g) / 4) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      if (curMode === 'radial') {
        const cx = width * 0.5;
        const cy = height * 0.5;
        const baseR = Math.min(width, height) * 0.22;
        const maxLen = Math.min(width, height) * 0.24;

        ctx.strokeStyle = palette.baselineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2.5, (Math.PI * 2 * baseR) / (BAR_COUNT * 2.1));
        for (let i = 0; i < BAR_COUNT; i++) {
          const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const barLen = 4 + smoothed[i] * maxLen;
          const x0 = cx + Math.cos(angle) * (baseR + 4);
          const y0 = cy + Math.sin(angle) * (baseR + 4);
          const x1 = cx + Math.cos(angle) * (baseR + 4 + barLen);
          const y1 = cy + Math.sin(angle) * (baseR + 4 + barLen);

          const rGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          rGrad.addColorStop(0, palette.barLow);
          rGrad.addColorStop(0.5, palette.barMid);
          rGrad.addColorStop(1, palette.barTop);
          ctx.strokeStyle = rGrad;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();

          if (peaks[i] > 0.03) {
            const px = cx + Math.cos(angle) * (baseR + 6 + peaks[i] * maxLen);
            const py = cy + Math.sin(angle) * (baseR + 6 + peaks[i] * maxLen);
            ctx.fillStyle = palette.peakColor;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (curMode === 'mirror_wave') {
        const cy = height * 0.5;
        const padX = Math.max(10, width * 0.025);
        const usableW = width - padX * 2;
        const slotW = usableW / BAR_COUNT;
        const barW = Math.max(3, slotW * 0.64);
        const radius = Math.min(4, barW * 0.5);
        const maxHalf = height * 0.42;

        ctx.strokeStyle = palette.baselineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX, Math.round(cy) + 0.5);
        ctx.lineTo(width - padX, Math.round(cy) + 0.5);
        ctx.stroke();

        const upGrad = ctx.createLinearGradient(0, cy - maxHalf, 0, cy);
        upGrad.addColorStop(0, palette.barTop);
        upGrad.addColorStop(0.65, palette.barMid);
        upGrad.addColorStop(1, palette.barLow);

        const downGrad = ctx.createLinearGradient(0, cy, 0, cy + maxHalf * 0.72);
        downGrad.addColorStop(0, palette.reflectionTop);
        downGrad.addColorStop(1, palette.reflectionBottom);

        for (let i = 0; i < BAR_COUNT; i++) {
          const x = padX + i * slotW + (slotW - barW) * 0.5;
          const h = Math.max(2, smoothed[i] * maxHalf);
          ctx.fillStyle = upGrad;
          drawRoundedTopBar(ctx, x, cy - h, barW, h, radius);
          ctx.fill();

          ctx.fillStyle = downGrad;
          drawRoundedBottomBar(ctx, x, cy + 1, barW, h * 0.68, radius);
          ctx.fill();

          const pH = peaks[i] * maxHalf;
          if (pH > 4) {
            ctx.fillStyle = palette.peakColor;
            ctx.fillRect(x, cy - pH - 3, barW, 2);
          }
        }
      } else if (curMode === 'water_reflex' || curMode === 'line_area') {
        const baselineY = Math.round(height * (curMode === 'water_reflex' ? 0.68 : 0.78));
        const maxH = baselineY - 14;
        const reflH = height - baselineY - 6;

        ctx.strokeStyle = palette.baselineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, baselineY + 0.5);
        ctx.lineTo(width, baselineY + 0.5);
        ctx.stroke();

        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          points.push({
            x: (i / (BAR_COUNT - 1)) * width,
            y: baselineY - smoothed[i] * maxH,
          });
        }

        const areaGrad = ctx.createLinearGradient(0, 12, 0, baselineY);
        areaGrad.addColorStop(0, palette.barTop);
        areaGrad.addColorStop(0.5, palette.barMid);
        areaGrad.addColorStop(1, palette.barLow);

        ctx.beginPath();
        ctx.moveTo(0, baselineY);
        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) * 0.5;
          const yc = (points[i].y + points[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(width, baselineY);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) * 0.5;
          const yc = (points[i].y + points[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = palette.peakColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Subtle baseline mirror reflection
        const reflGrad = ctx.createLinearGradient(0, baselineY, 0, height);
        reflGrad.addColorStop(0, palette.reflectionTop);
        reflGrad.addColorStop(1, palette.reflectionBottom);

        ctx.beginPath();
        ctx.moveTo(0, baselineY);
        for (let i = 0; i < points.length; i++) {
          const ry = baselineY + Math.min(reflH, (baselineY - points[i].y) * 0.44);
          if (i === 0) ctx.lineTo(points[i].x, ry);
          else {
            const prevRy = baselineY + Math.min(reflH, (baselineY - points[i - 1].y) * 0.44);
            const xc = (points[i - 1].x + points[i].x) * 0.5;
            const yc = (prevRy + ry) * 0.5;
            ctx.quadraticCurveTo(points[i - 1].x, prevRy, xc, yc);
          }
        }
        ctx.lineTo(width, baselineY);
        ctx.closePath();
        ctx.fillStyle = reflGrad;
        ctx.fill();
      } else {
        // Default: 'led_bars' (and 'octave_bars'): Rounded-cap vertical gradient bars + gravity peaks + baseline mirror reflection
        const activeCount = curMode === 'octave_bars' ? 28 : BAR_COUNT;
        const stepSample = BAR_COUNT / activeCount;
        const padX = Math.max(10, width * 0.025);
        const usableW = width - padX * 2;
        const baselineY = Math.round(height * 0.73);
        const maxBarH = baselineY - 16;
        const maxReflH = Math.max(16, height - baselineY - 6);
        const slotW = usableW / activeCount;
        const barW = Math.max(3, slotW * (curMode === 'octave_bars' ? 0.72 : 0.62));
        const capRadius = Math.min(5, barW * 0.5);

        // Baseline horizon rule
        ctx.strokeStyle = palette.baselineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX, baselineY + 0.5);
        ctx.lineTo(width - padX, baselineY + 0.5);
        ctx.stroke();

        const barGrad = ctx.createLinearGradient(0, baselineY - maxBarH, 0, baselineY);
        barGrad.addColorStop(0, palette.barTop);
        barGrad.addColorStop(0.55, palette.barMid);
        barGrad.addColorStop(1, palette.barLow);

        const reflGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + maxReflH);
        reflGrad.addColorStop(0, palette.reflectionTop);
        reflGrad.addColorStop(1, palette.reflectionBottom);

        for (let i = 0; i < activeCount; i++) {
          const srcIdx = Math.min(BAR_COUNT - 1, Math.floor(i * stepSample));
          const mag = smoothed[srcIdx];
          const peakMag = peaks[srcIdx];
          const x = padX + i * slotW + (slotW - barW) * 0.5;
          const barH = Math.max(3, mag * maxBarH);

          // Main rounded-cap vertical gradient bar
          ctx.save();
          ctx.shadowColor = palette.glowColor;
          ctx.shadowBlur = active && mag > 0.25 ? 8 : 0;
          ctx.fillStyle = barGrad;
          drawRoundedTopBar(ctx, x, baselineY - barH, barW, barH, capRadius);
          ctx.fill();
          ctx.restore();

          // Bright rounded top-cap edge highlight
          if (barH > 4) {
            ctx.fillStyle = palette.peakColor;
            drawRoundedTopBar(ctx, x, baselineY - barH, barW, Math.min(3, barH), capRadius);
            ctx.fill();
          }

          // Smooth peak-decay gravity cap floating above bar
          const peakY = baselineY - Math.max(barH, peakMag * maxBarH) - 4;
          if (peakMag > 0.02 && peakY >= 4) {
            ctx.fillStyle = palette.peakColor;
            ctx.fillRect(x, peakY, barW, 2);
          }

          // Subtle baseline mirror reflection
          const reflH = Math.min(maxReflH, barH * 0.36);
          if (reflH > 1.5) {
            ctx.fillStyle = reflGrad;
            drawRoundedBottomBar(ctx, x, baselineY + 2, barW, reflH, capRadius);
            ctx.fill();
          }
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-label={`Audio visualizer: ${mode}`}
      className="relative h-full w-full overflow-hidden"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
