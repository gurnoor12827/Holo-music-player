export type HoloCoverStyle = 'holo-wave' | 'vinyl' | 'grid' | 'cassette' | 'minimal';

export const HOLO_COVER_STYLES: { id: HoloCoverStyle; label: string }[] = [
  { id: 'holo-wave', label: 'Holo Spectrum' },
  { id: 'vinyl', label: 'Vinyl Pressing' },
  { id: 'grid', label: 'KitKat Matrix' },
  { id: 'cassette', label: 'Cassette Deck' },
  { id: 'minimal', label: 'Monolith' },
];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createPrng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateHoloCoverArt(options: {
  title: string;
  artist: string;
  album: string;
  style: HoloCoverStyle;
  seedText?: string;
}): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const seedInput = `${options.style}::${options.seedText || ''}::${options.title}::${options.artist}::${options.album}`;
  const rand = createPrng(hashSeed(seedInput));

  // Accent palette anchored around authentic Holo Blue with subtle harmonic secondary tint
  const palettes = [
    { primary: '#33B5E5', dark: '#0099CC', glow: 'rgba(51, 181, 229, 0.38)', bgTop: '#080c10', bgBot: '#18222b' },
    { primary: '#33B5E5', dark: '#0077AA', glow: 'rgba(51, 181, 229, 0.35)', bgTop: '#070a0d', bgBot: '#152028' },
    { primary: '#56C8F2', dark: '#0099CC', glow: 'rgba(86, 200, 242, 0.36)', bgTop: '#0a0f14', bgBot: '#1c2630' },
    { primary: '#33B5E5', dark: '#006688', glow: 'rgba(51, 181, 229, 0.4)', bgTop: '#05080b', bgBot: '#111a22' },
  ];
  const pal = palettes[Math.floor(rand() * palettes.length)];

  // Base Holo Dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, pal.bgTop);
  bgGrad.addColorStop(1, pal.bgBot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  if (options.style === 'holo-wave') {
    // Radial ambient glow
    const rad = ctx.createRadialGradient(size / 2, size * 0.44, 24, size / 2, size * 0.44, 240);
    rad.addColorStop(0, pal.glow);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, size, size);

    // Spectrum bars
    const barCount = 24;
    const barWidth = 10;
    const gap = 6;
    const totalW = barCount * (barWidth + gap) - gap;
    const startX = (size - totalW) / 2;
    const baselineY = size * 0.62;
    for (let i = 0; i < barCount; i++) {
      const norm = Math.sin((i / barCount) * Math.PI);
      const barH = 28 + rand() * 140 * (0.45 + 0.55 * norm);
      const x = startX + i * (barWidth + gap);
      const grad = ctx.createLinearGradient(0, baselineY - barH, 0, baselineY);
      grad.addColorStop(0, pal.primary);
      grad.addColorStop(1, pal.dark);
      ctx.fillStyle = grad;
      ctx.fillRect(x, baselineY - barH, barWidth, barH);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x, baselineY - barH - 4, barWidth, 2);
    }

    // Horizontal glowing waveform line
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 28; x <= size - 28; x += 6) {
      const y =
        size * 0.68 +
        Math.sin(x * 0.045 + rand() * 0.5) * 14 +
        Math.cos(x * 0.02) * 8;
      if (x === 28) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (options.style === 'vinyl') {
    const cx = size / 2;
    const cy = size * 0.46;
    // Outer vinyl disc
    ctx.fillStyle = '#0a0c0e';
    ctx.beginPath();
    ctx.arc(cx, cy, 185, 0, Math.PI * 2);
    ctx.fill();

    // Grooves
    for (let r = 74; r < 180; r += 6) {
      ctx.strokeStyle = r % 18 === 0 ? 'rgba(51, 181, 229, 0.22)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Holo Blue center label
    const lblGrad = ctx.createLinearGradient(cx - 64, cy - 64, cx + 64, cy + 64);
    lblGrad.addColorStop(0, pal.primary);
    lblGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = lblGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();

    // Spindle hole
    ctx.fillStyle = '#0a0c0e';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (options.style === 'grid') {
    // Precision Holo technical matrix
    ctx.strokeStyle = 'rgba(51, 181, 229, 0.14)';
    ctx.lineWidth = 1;
    for (let p = 32; p < size; p += 32) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // Concentric geometric rings
    const cx = size / 2;
    const cy = size * 0.44;
    for (let i = 0; i < 4; i++) {
      const r = 55 + i * 38;
      ctx.strokeStyle = i === 1 ? pal.primary : 'rgba(51, 181, 229, 0.42)';
      ctx.lineWidth = i === 1 ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, rand() * Math.PI, rand() * Math.PI + Math.PI * 1.45);
      ctx.stroke();
    }
  } else if (options.style === 'cassette') {
    const x = 66;
    const y = 96;
    const w = size - 132;
    const h = 236;
    ctx.fillStyle = '#1e242b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label strip
    ctx.fillStyle = '#2d353e';
    ctx.fillRect(x + 20, y + 20, w - 40, 74);
    ctx.fillStyle = pal.primary;
    ctx.fillRect(x + 20, y + 20, w - 40, 8);

    // Tape window & spools
    ctx.fillStyle = '#0c0f12';
    ctx.fillRect(x + 48, y + 112, w - 96, 76);
    for (const sx of [x + 110, x + w - 110]) {
      ctx.strokeStyle = pal.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, y + 150, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, y + 150, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Minimal Monolith
    for (let i = 0; i < 6; i++) {
      const bw = 90 + rand() * 180;
      const bh = 90 + rand() * 180;
      const bx = 40 + rand() * (size - bw - 80);
      const by = 40 + rand() * (size * 0.65 - bh);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(51, 181, 229, 0.16)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = i === 0 ? pal.primary : 'rgba(51, 181, 229, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
    }
  }

  // Subtle top/bottom Holo dark scrim & typography plaque
  const footerGrad = ctx.createLinearGradient(0, size * 0.68, 0, size);
  footerGrad.addColorStop(0, 'rgba(0,0,0,0)');
  footerGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, size * 0.68, size, size * 0.32);

  // Accent bar
  ctx.fillStyle = pal.primary;
  ctx.fillRect(28, size - 102, 46, 3);

  const displayTitle = (options.seedText?.trim() || options.album || options.title || 'Holo Music').slice(0, 28);
  const displayArtist = (options.artist || 'Local Audio').slice(0, 32);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 24px "Hanken Grotesk", sans-serif';
  ctx.fillText(displayTitle, 28, size - 64);

  ctx.fillStyle = pal.primary;
  ctx.font = '500 16px "Hanken Grotesk", sans-serif';
  ctx.fillText(displayArtist.toUpperCase(), 28, size - 36);

  // Subtle dither/noise pass on canvas
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function processDeviceImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const sx = Math.max(0, ((img.naturalWidth || img.width) - minSide) / 2);
        const sy = Math.max(0, ((img.naturalHeight || img.height) - minSide) / 2);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Selected file could not be decoded as an image.'));
    };
    img.src = objectUrl;
  });
}
