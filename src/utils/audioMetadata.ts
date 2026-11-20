import type { TrackRecord } from '../types/music';

interface ParsedAudioTags {
  title?: string;
  artist?: string;
  album?: string;
  artworkDataUrl?: string | null;
}

const MAX_ARTWORK_BYTES = 3 * 1024 * 1024;
const MAX_HEADER_SLICE = 8 * 1024 * 1024;

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

function readUint24BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    ((bytes[offset + 3] << 24) >>> 0)
  );
}

function readSynchsafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function decodeAscii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  const end = Math.min(bytes.length, start + length);
  for (let i = start; i < end; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function decodeTextByEncoding(bytes: Uint8Array, encoding: number): string {
  if (bytes.length === 0) return '';
  try {
    if (encoding === 0) {
      // ISO-8859-1
      let text = '';
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) break;
        text += String.fromCharCode(bytes[i]);
      }
      return text.trim();
    }
    if (encoding === 1) {
      // UTF-16 with BOM
      if (bytes.length >= 2) {
        const isLE = bytes[0] === 0xff && bytes[1] === 0xfe;
        const isBE = bytes[0] === 0xfe && bytes[1] === 0xff;
        const slice = isLE || isBE ? bytes.subarray(2) : bytes;
        const decoder = new TextDecoder(isBE ? 'utf-16be' : 'utf-16le');
        return decoder.decode(slice).replace(/\0+$/g, '').trim();
      }
    }
    if (encoding === 2) {
      return new TextDecoder('utf-16be').decode(bytes).replace(/\0+$/g, '').trim();
    }
    // encoding === 3 (UTF-8) or fallback
    return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/g, '').trim();
  } catch {
    return decodeAscii(bytes, 0, bytes.length).replace(/\0+$/g, '').trim();
  }
}

function sniffImageMime(imageBytes: Uint8Array, declaredMime: string): string {
  if (imageBytes.length >= 4) {
    if (
      imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47
    ) {
      return 'image/png';
    }
    if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
      return 'image/jpeg';
    }
    if (
      imageBytes[0] === 0x47 &&
      imageBytes[1] === 0x49 &&
      imageBytes[2] === 0x46 &&
      imageBytes[3] === 0x38
    ) {
      return 'image/gif';
    }
    if (
      imageBytes.length >= 12 &&
      imageBytes[0] === 0x52 &&
      imageBytes[1] === 0x49 &&
      imageBytes[2] === 0x46 &&
      imageBytes[3] === 0x46 &&
      imageBytes[8] === 0x57 &&
      imageBytes[9] === 0x45 &&
      imageBytes[10] === 0x42 &&
      imageBytes[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  const normalized = declaredMime.toLowerCase().trim();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized.startsWith('image/')) return normalized;
  return 'image/jpeg';
}

function bytesToDataUrl(imageBytes: Uint8Array, mimeType: string): string | null {
  if (imageBytes.length === 0 || imageBytes.length > MAX_ARTWORK_BYTES) {
    return null;
  }
  const resolvedMime = sniffImageMime(imageBytes, mimeType);
  let binary = '';
  const chunkSize = 0x4000;
  for (let i = 0; i < imageBytes.length; i += chunkSize) {
    const chunk = imageBytes.subarray(i, Math.min(i + chunkSize, imageBytes.length));
    binary += String.fromCharCode(...chunk);
  }
  try {
    return `data:${resolvedMime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function parseId3v2(bytes: Uint8Array): ParsedAudioTags {
  const tags: ParsedAudioTags = {};
  if (bytes.length < 10) return tags;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return tags;

  const majorVersion = bytes[3];
  const flags = bytes[5];
  const tagSize = readSynchsafeInt(bytes, 6);
  const tagEnd = Math.min(bytes.length, 10 + tagSize);

  let offset = 10;
  // Extended header (ID3v2.3 / 2.4)
  if ((flags & 0x40) !== 0 && offset + 4 <= tagEnd) {
    const extSize =
      majorVersion >= 4 ? readSynchsafeInt(bytes, offset) : readUint32BE(bytes, offset);
    offset += majorVersion >= 4 ? extSize : extSize + 4;
  }

  while (offset < tagEnd) {
    if (bytes[offset] === 0) break;

    let frameId = '';
    let frameSize = 0;
    let headerSize = 0;

    if (majorVersion === 2) {
      if (offset + 6 > tagEnd) break;
      frameId = decodeAscii(bytes, offset, 3);
      frameSize = readUint24BE(bytes, offset + 3);
      headerSize = 6;
    } else {
      if (offset + 10 > tagEnd) break;
      frameId = decodeAscii(bytes, offset, 4);
      frameSize =
        majorVersion >= 4 ? readSynchsafeInt(bytes, offset + 4) : readUint32BE(bytes, offset + 4);
      headerSize = 10;
    }

    if (frameSize <= 0 || offset + headerSize + frameSize > tagEnd) {
      break;
    }

    const payload = bytes.subarray(offset + headerSize, offset + headerSize + frameSize);

    if (frameId === 'TIT2' || frameId === 'TT2') {
      const value = decodeTextByEncoding(payload.subarray(1), payload[0]);
      if (value) tags.title = value;
    } else if (frameId === 'TPE1' || frameId === 'TP1') {
      const value = decodeTextByEncoding(payload.subarray(1), payload[0]);
      if (value) tags.artist = value;
    } else if (frameId === 'TALB' || frameId === 'TAL') {
      const value = decodeTextByEncoding(payload.subarray(1), payload[0]);
      if (value) tags.album = value;
    } else if ((frameId === 'APIC' || frameId === 'PIC') && !tags.artworkDataUrl) {
      const art = parseId3Artwork(payload, frameId === 'PIC');
      if (art) tags.artworkDataUrl = art;
    }

    offset += headerSize + frameSize;
  }

  return tags;
}

function parseId3Artwork(payload: Uint8Array, isLegacyPic: boolean): string | null {
  if (payload.length < 6) return null;
  const encoding = payload[0];
  let cursor = 1;
  let mime = 'image/jpeg';

  if (isLegacyPic) {
    if (cursor + 3 >= payload.length) return null;
    const fmt = decodeAscii(payload, cursor, 3).toUpperCase();
    mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg';
    cursor += 3;
  } else {
    let endMime = cursor;
    while (endMime < payload.length && payload[endMime] !== 0) {
      endMime++;
    }
    mime = decodeAscii(payload, cursor, endMime - cursor) || 'image/jpeg';
    if (mime.trim() === '-->') {
      return null;
    }
    cursor = endMime + 1;
  }

  // Skip picture type byte
  if (cursor >= payload.length) return null;
  cursor += 1;

  // Skip description (1-byte or 2-byte null terminator depending on encoding)
  if (encoding === 1 || encoding === 2) {
    while (cursor + 1 < payload.length) {
      if (payload[cursor] === 0 && payload[cursor + 1] === 0) {
        cursor += 2;
        break;
      }
      cursor += 2;
    }
  } else {
    while (cursor < payload.length) {
      if (payload[cursor] === 0) {
        cursor += 1;
        break;
      }
      cursor += 1;
    }
  }

  if (cursor >= payload.length) return null;
  return bytesToDataUrl(payload.subarray(cursor), mime);
}

function parseId3v1(bytes: Uint8Array): ParsedAudioTags {
  const tags: ParsedAudioTags = {};
  if (bytes.length < 128) return tags;
  const start = bytes.length - 128;
  if (decodeAscii(bytes, start, 3) !== 'TAG') return tags;

  const title = decodeTextByEncoding(bytes.subarray(start + 3, start + 33), 0);
  const artist = decodeTextByEncoding(bytes.subarray(start + 33, start + 63), 0);
  const album = decodeTextByEncoding(bytes.subarray(start + 63, start + 93), 0);

  if (title) tags.title = title;
  if (artist) tags.artist = artist;
  if (album) tags.album = album;
  return tags;
}

function parseFlac(bytes: Uint8Array): ParsedAudioTags {
  const tags: ParsedAudioTags = {};
  if (bytes.length < 8 || decodeAscii(bytes, 0, 4) !== 'fLaC') return tags;

  let offset = 4;
  let isLast = false;

  while (!isLast && offset + 4 <= bytes.length) {
    const headerByte = bytes[offset];
    isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7f;
    const blockSize = readUint24BE(bytes, offset + 1);
    offset += 4;

    if (offset + blockSize > bytes.length) break;

    if (blockType === 4) {
      // VORBIS_COMMENT
      parseVorbisCommentBlock(bytes.subarray(offset, offset + blockSize), tags);
    } else if (blockType === 6 && !tags.artworkDataUrl) {
      // PICTURE
      tags.artworkDataUrl = parseFlacPictureBlock(bytes.subarray(offset, offset + blockSize));
    }

    offset += blockSize;
  }

  return tags;
}

function parseVorbisCommentBlock(block: Uint8Array, tags: ParsedAudioTags): void {
  if (block.length < 8) return;
  let cursor = 0;
  const vendorLen = readUint32LE(block, cursor);
  cursor += 4 + vendorLen;
  if (cursor + 4 > block.length) return;

  const commentCount = readUint32LE(block, cursor);
  cursor += 4;

  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < commentCount; i++) {
    if (cursor + 4 > block.length) break;
    const len = readUint32LE(block, cursor);
    cursor += 4;
    if (cursor + len > block.length) break;

    const entry = decoder.decode(block.subarray(cursor, cursor + len));
    cursor += len;
    const eq = entry.indexOf('=');
    if (eq === -1) continue;

    const key = entry.slice(0, eq).toUpperCase();
    const val = entry.slice(eq + 1).trim();
    if (!val) continue;

    if (key === 'TITLE' && !tags.title) tags.title = val;
    else if (key === 'ARTIST' && !tags.artist) tags.artist = val;
    else if (key === 'ALBUM' && !tags.album) tags.album = val;
  }
}

function parseFlacPictureBlock(block: Uint8Array): string | null {
  if (block.length < 32) return null;
  let cursor = 4; // skip picture type
  const mimeLen = readUint32BE(block, cursor);
  cursor += 4;
  if (cursor + mimeLen + 4 > block.length) return null;
  const mime = decodeAscii(block, cursor, mimeLen);
  cursor += mimeLen;

  const descLen = readUint32BE(block, cursor);
  cursor += 4 + descLen + 16; // skip description + width, height, depth, colors
  if (cursor + 4 > block.length) return null;

  const dataLen = readUint32BE(block, cursor);
  cursor += 4;
  if (cursor + dataLen > block.length) return null;

  return bytesToDataUrl(block.subarray(cursor, cursor + dataLen), mime);
}

function parseMp4Atoms(bytes: Uint8Array): ParsedAudioTags {
  const tags: ParsedAudioTags = {};
  if (bytes.length < 16) return tags;

  const decoder = new TextDecoder('utf-8');

  function walk(start: number, end: number): void {
    let cursor = start;
    while (cursor + 8 <= end) {
      let size = readUint32BE(bytes, cursor);
      const type = decodeAscii(bytes, cursor + 4, 4);
      let header = 8;

      if (size === 1 && cursor + 16 <= end) {
        size = readUint32BE(bytes, cursor + 12);
        header = 16;
      } else if (size === 0) {
        size = end - cursor;
      }

      if (size < header || cursor + size > end) break;

      const bodyStart = cursor + header;
      const bodyEnd = cursor + size;

      if (type === 'moov' || type === 'udta' || type === 'ilst') {
        walk(bodyStart, bodyEnd);
      } else if (type === 'meta') {
        if (bodyStart + 4 <= bodyEnd) {
          walk(bodyStart + 4, bodyEnd);
        }
      } else if (type === '\xa9nam' || type === '\xa9ART' || type === '\xa9alb' || type === 'covr') {
        const dataPayload = findMp4DataAtom(bodyStart, bodyEnd);
        if (dataPayload) {
          if (type === '\xa9nam') {
            tags.title = decoder.decode(dataPayload).trim();
          } else if (type === '\xa9ART') {
            tags.artist = decoder.decode(dataPayload).trim();
          } else if (type === '\xa9alb') {
            tags.album = decoder.decode(dataPayload).trim();
          } else if (type === 'covr' && !tags.artworkDataUrl) {
            tags.artworkDataUrl = bytesToDataUrl(dataPayload, 'image/jpeg');
          }
        }
      }

      cursor += size;
    }
  }

  function findMp4DataAtom(start: number, end: number): Uint8Array | null {
    let cursor = start;
    while (cursor + 8 <= end) {
      const size = readUint32BE(bytes, cursor);
      const type = decodeAscii(bytes, cursor + 4, 4);
      if (size < 8 || cursor + size > end) break;
      if (type === 'data' && size > 16) {
        return bytes.subarray(cursor + 16, cursor + size);
      }
      cursor += size;
    }
    return null;
  }

  walk(0, bytes.length);
  return tags;
}

function parseWavInfo(bytes: Uint8Array): ParsedAudioTags {
  const tags: ParsedAudioTags = {};
  if (bytes.length < 16 || decodeAscii(bytes, 0, 4) !== 'RIFF') return tags;
  if (decodeAscii(bytes, 8, 4) !== 'WAVE') return tags;

  let cursor = 12;
  while (cursor + 8 <= bytes.length) {
    const id = decodeAscii(bytes, cursor, 4);
    const size = readUint32LE(bytes, cursor + 4);
    cursor += 8;
    if (cursor + size > bytes.length) break;

    if (id === 'LIST' && size >= 4 && decodeAscii(bytes, cursor, 4) === 'INFO') {
      let sub = cursor + 4;
      const listEnd = cursor + size;
      while (sub + 8 <= listEnd) {
        const subId = decodeAscii(bytes, sub, 4);
        const subSize = readUint32LE(bytes, sub + 4);
        sub += 8;
        if (sub + subSize > listEnd) break;
        const value = decodeTextByEncoding(bytes.subarray(sub, sub + subSize), 0);
        if (value) {
          if (subId === 'INAM') tags.title = value;
          else if (subId === 'IART') tags.artist = value;
          else if (subId === 'IPRD') tags.album = value;
        }
        sub += subSize + (subSize % 2);
      }
    }

    cursor += size + (size % 2);
  }
  return tags;
}

function fallbackFromFileName(fileName: string): { title: string; artist: string } {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim();
  const dashSplit = withoutExt.split(/\s+-\s+/);
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim() || 'Unknown Artist',
      title: dashSplit.slice(1).join(' - ').trim() || withoutExt,
    };
  }
  return {
    title: withoutExt || 'Untitled Track',
    artist: 'Unknown Artist',
  };
}

function probeDurationSeconds(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.src = '';
      URL.revokeObjectURL(objectUrl);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(0);
    }, 4000);

    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      cleanup();
      resolve(duration);
    };

    audio.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(0);
    };

    audio.src = objectUrl;
  });
}

export interface AudioTechDetails {
  audioFormat: string;
  bitrateKbps?: number;
  sampleRateHz?: number;
  channels?: number;
  filePath: string;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function parseMp3FrameHeader(
  bytes: Uint8Array,
  startOffset: number
): { bitrateKbps?: number; sampleRateHz?: number; channels?: number } {
  const mp3RatesV1 = [44100, 48000, 32000];
  const mp3RatesV2 = [22050, 24000, 16000];
  const mp3RatesV25 = [11025, 12000, 8000];
  const brV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const brV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

  const limit = Math.min(bytes.length - 4, startOffset + 65536);
  for (let i = Math.max(0, startOffset); i < limit; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const versionBits = (bytes[i + 1] >> 3) & 0x03;
    const layerBits = (bytes[i + 1] >> 1) & 0x03;
    const brIndex = (bytes[i + 2] >> 4) & 0x0f;
    const srIndex = (bytes[i + 2] >> 2) & 0x03;
    const channelMode = (bytes[i + 3] >> 6) & 0x03;

    if (versionBits === 1 || layerBits === 0 || brIndex === 0 || brIndex === 15 || srIndex === 3) {
      continue;
    }

    let sampleRateHz = 44100;
    if (versionBits === 3) sampleRateHz = mp3RatesV1[srIndex];
    else if (versionBits === 2) sampleRateHz = mp3RatesV2[srIndex];
    else sampleRateHz = mp3RatesV25[srIndex];

    const bitrateKbps = versionBits === 3 ? brV1L3[brIndex] : brV2L3[brIndex];
    const channels = channelMode === 3 ? 1 : 2;
    if (sampleRateHz && bitrateKbps) {
      return { bitrateKbps, sampleRateHz, channels };
    }
  }
  return {};
}

function parseMp4AudioInfo(bytes: Uint8Array): { sampleRateHz?: number; channels?: number } {
  const limit = Math.min(bytes.length - 28, 524288);
  for (let i = 0; i < limit; i++) {
    if (
      bytes[i] === 0x6d &&
      bytes[i + 1] === 0x70 &&
      bytes[i + 2] === 0x34 &&
      bytes[i + 3] === 0x61
    ) {
      const channels = (bytes[i + 20] << 8) | bytes[i + 21];
      const srFixed = ((bytes[i + 28] << 8) | bytes[i + 29]) >>> 0;
      if (srFixed >= 8000 && srFixed <= 192000) {
        return {
          sampleRateHz: srFixed,
          channels: channels > 0 && channels <= 8 ? channels : 2,
        };
      }
    }
  }
  return {};
}

export function extractAudioTechMetadata(
  headBytes: Uint8Array,
  fileName: string,
  fileSize: number,
  mimeType: string,
  durationSec: number,
  filePath?: string
): AudioTechDetails {
  const resolvedPath = filePath && filePath.trim() ? filePath : fileName;
  let audioFormat = inferFormatLabel(fileName, mimeType);
  let sampleRateHz: number | undefined;
  let bitrateKbps: number | undefined;
  let channels: number | undefined;

  if (
    headBytes.length >= 10 &&
    headBytes[0] === 0x49 &&
    headBytes[1] === 0x44 &&
    headBytes[2] === 0x33
  ) {
    const id3Rev = `ID3v2.${headBytes[3]}`;
    audioFormat = `MP3 (${id3Rev})`;
    const tagSize = readSynchsafeInt(headBytes, 6);
    const frameStart = 10 + tagSize;
    const mp3 = parseMp3FrameHeader(headBytes, frameStart < headBytes.length ? frameStart : 10);
    sampleRateHz = mp3.sampleRateHz;
    bitrateKbps = mp3.bitrateKbps;
    channels = mp3.channels;
  } else if (headBytes.length >= 42 && decodeAscii(headBytes, 0, 4) === 'fLaC') {
    audioFormat = 'FLAC Lossless';
    if ((headBytes[4] & 0x7f) === 0) {
      const sr =
        (headBytes[18] << 12) | (headBytes[19] << 4) | ((headBytes[20] & 0xf0) >> 4);
      if (sr >= 8000 && sr <= 384000) {
        sampleRateHz = sr;
      }
      channels = ((headBytes[20] >> 1) & 0x07) + 1;
    }
  } else if (
    headBytes.length >= 44 &&
    decodeAscii(headBytes, 0, 4) === 'RIFF' &&
    decodeAscii(headBytes, 8, 4) === 'WAVE'
  ) {
    audioFormat = 'WAV (PCM)';
    let cursor = 12;
    while (cursor + 8 <= headBytes.length) {
      const id = decodeAscii(headBytes, cursor, 4);
      const size = readUint32LE(headBytes, cursor + 4);
      cursor += 8;
      if (cursor + size > headBytes.length) break;
      if (id === 'fmt ' && size >= 16) {
        channels = readUint16LE(headBytes, cursor + 2);
        sampleRateHz = readUint32LE(headBytes, cursor + 4);
        const byteRate = readUint32LE(headBytes, cursor + 8);
        if (byteRate > 0) {
          bitrateKbps = Math.round((byteRate * 8) / 1000);
        }
        break;
      }
      cursor += size + (size % 2);
    }
  } else if (headBytes.length >= 12 && decodeAscii(headBytes, 4, 4) === 'ftyp') {
    audioFormat = 'AAC / MP4 Container';
    const mp4 = parseMp4AudioInfo(headBytes);
    sampleRateHz = mp4.sampleRateHz;
    channels = mp4.channels;
  } else if (headBytes.length >= 44 && decodeAscii(headBytes, 0, 4) === 'OggS') {
    audioFormat = 'OGG Vorbis / Opus';
    for (let i = 0; i < Math.min(headBytes.length - 16, 512); i++) {
      if (
        headBytes[i] === 0x76 &&
        headBytes[i + 1] === 0x6f &&
        headBytes[i + 2] === 0x72 &&
        headBytes[i + 3] === 0x62 &&
        headBytes[i + 4] === 0x69 &&
        headBytes[i + 5] === 0x73 &&
        i + 16 < headBytes.length
      ) {
        channels = headBytes[i + 10];
        sampleRateHz = readUint32LE(headBytes, i + 11);
        break;
      }
    }
  } else if (headBytes.length >= 4 && headBytes[0] === 0xff && (headBytes[1] & 0xe0) === 0xe0) {
    audioFormat = 'MP3 (MPEG Audio)';
    const mp3 = parseMp3FrameHeader(headBytes, 0);
    sampleRateHz = mp3.sampleRateHz;
    bitrateKbps = mp3.bitrateKbps;
    channels = mp3.channels;
  }

  if ((!bitrateKbps || audioFormat.includes('FLAC') || audioFormat.includes('AAC')) && durationSec > 0.5 && fileSize > 0) {
    const avgKbps = Math.round((fileSize * 8) / (durationSec * 1000));
    if (avgKbps > 8 && avgKbps < 10000) {
      bitrateKbps = bitrateKbps ?? avgKbps;
    }
  }

  return {
    audioFormat,
    bitrateKbps,
    sampleRateHz,
    channels,
    filePath: resolvedPath,
  };
}

export async function probeTrackTechMetadata(track: TrackRecord): Promise<AudioTechDetails> {
  if (track.audioFormat && track.bitrateKbps && track.sampleRateHz && track.filePath) {
    return {
      audioFormat: track.audioFormat,
      bitrateKbps: track.bitrateKbps,
      sampleRateHz: track.sampleRateHz,
      channels: track.channels,
      filePath: track.filePath,
    };
  }
  const headSlice = await track.blob
    .slice(0, Math.min(track.blob.size, 524288))
    .arrayBuffer();
  return extractAudioTechMetadata(
    new Uint8Array(headSlice),
    track.fileName,
    track.fileSize,
    track.mimeType,
    track.durationSec,
    track.filePath || track.fileName
  );
}

export async function parseAudioFile(file: File): Promise<TrackRecord> {
  const headSlice = await file.slice(0, Math.min(file.size, MAX_HEADER_SLICE)).arrayBuffer();
  const headBytes = new Uint8Array(headSlice);

  let parsed: ParsedAudioTags = {};

  if (headBytes.length >= 3 && headBytes[0] === 0x49 && headBytes[1] === 0x44 && headBytes[2] === 0x33) {
    parsed = parseId3v2(headBytes);
  } else if (headBytes.length >= 4 && decodeAscii(headBytes, 0, 4) === 'fLaC') {
    parsed = parseFlac(headBytes);
  } else if (headBytes.length >= 12 && decodeAscii(headBytes, 4, 4) === 'ftyp') {
    parsed = parseMp4Atoms(headBytes);
  } else if (headBytes.length >= 12 && decodeAscii(headBytes, 0, 4) === 'RIFF') {
    parsed = parseWavInfo(headBytes);
  }

  // Fallback to ID3v1 tail if needed
  if ((!parsed.title || !parsed.artist || !parsed.album) && file.size >= 128) {
    const tailSlice = await file.slice(file.size - 128, file.size).arrayBuffer();
    const id3v1 = parseId3v1(new Uint8Array(tailSlice));
    parsed.title = parsed.title || id3v1.title;
    parsed.artist = parsed.artist || id3v1.artist;
    parsed.album = parsed.album || id3v1.album;
  }

  const durationSec = await probeDurationSeconds(file);
  const nameFallback = fallbackFromFileName(file.name);

  const id = `${file.name}::${file.size}::${file.lastModified}`;
  const mimeType = file.type || inferMimeFromExtension(file.name);
  const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const filePath = relPath && relPath.trim() ? relPath : file.name;
  const tech = extractAudioTechMetadata(
    headBytes,
    file.name,
    file.size,
    mimeType,
    durationSec,
    filePath
  );

  return {
    id,
    title: parsed.title || nameFallback.title,
    artist: parsed.artist || nameFallback.artist,
    album: parsed.album || 'Local Library',
    durationSec,
    fileName: file.name,
    filePath: tech.filePath,
    fileSize: file.size,
    mimeType,
    audioFormat: tech.audioFormat,
    bitrateKbps: tech.bitrateKbps,
    sampleRateHz: tech.sampleRateHz,
    channels: tech.channels,
    artworkDataUrl: parsed.artworkDataUrl || null,
    addedAt: Date.now(),
    blob: file,
  };
}

function inferFormatLabel(fileName: string, mimeType: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mp3') || mimeType === 'audio/mpeg') return 'MP3 (MPEG Audio)';
  if (lower.endsWith('.flac') || mimeType === 'audio/flac') return 'FLAC Lossless';
  if (lower.endsWith('.wav') || mimeType === 'audio/wav') return 'WAV (PCM)';
  if (lower.endsWith('.m4a') || lower.endsWith('.aac') || mimeType === 'audio/mp4') {
    return 'AAC / M4A';
  }
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'OGG Audio';
  return mimeType || 'Local Audio';
}

function inferMimeFromExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'audio/ogg';
  return 'audio/mpeg';
}

export function isSupportedAudioFile(file: File): boolean {
  if (file.type && file.type.startsWith('audio/')) return true;
  return /\.(mp3|flac|wav|m4a|aac|ogg|opus|wma|webm)$/i.test(file.name);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
