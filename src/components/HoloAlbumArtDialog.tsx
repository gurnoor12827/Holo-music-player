import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { TrackRecord } from '../types/music';
import {
  generateHoloCoverArt,
  HOLO_COVER_STYLES,
  processDeviceImageFile,
  type HoloCoverStyle,
} from '../utils/albumArtGenerator';
import { HoloCloseIcon, HoloImageEditIcon, HoloMusicNoteIcon, HoloSearchIcon } from './HoloIcons';

interface HoloAlbumArtDialogProps {
  track: TrackRecord | null;
  allTracks: TrackRecord[];
  isCorrupted?: boolean;
  onSaveArtwork: (track: TrackRecord, artworkDataUrl: string | null, applyToAlbum: boolean) => void;
  onClose: () => void;
}

type EditorTab = 'generate' | 'device' | 'library';

export function HoloAlbumArtDialog({
  track,
  allTracks,
  isCorrupted = false,
  onSaveArtwork,
  onClose,
}: HoloAlbumArtDialogProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>('generate');
  const [selectedStyle, setSelectedStyle] = useState<HoloCoverStyle>('holo-wave');
  const [seedText, setSeedText] = useState('');
  const [variantCounter, setVariantCounter] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [applyToAlbum, setApplyToAlbum] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!track) return;
    const initialSeed =
      track.album && track.album !== 'Local Library' ? track.album : track.title;
    setActiveTab('generate');
    setSelectedStyle('holo-wave');
    setSeedText(initialSeed);
    setVariantCounter(0);
    setErrorMsg(null);
    setLibraryQuery('');

    if (!track.artworkDataUrl || isCorrupted) {
      const generated = generateHoloCoverArt({
        title: track.title,
        artist: track.artist,
        album: track.album,
        style: 'holo-wave',
        seedText: initialSeed,
      });
      setPreviewUrl(generated);
      setPreviewBroken(false);
    } else {
      setPreviewUrl(track.artworkDataUrl);
      setPreviewBroken(false);
    }
  }, [track, isCorrupted]);

  const albumTrackCount = useMemo(() => {
    if (!track) return 0;
    return allTracks.filter((t) => t.album === track.album && t.artist === track.artist).length;
  }, [track, allTracks]);

  const libraryArtMatches = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const results: { id: string; label: string; sub: string; url: string }[] = [];

    for (const t of allTracks) {
      if (!t.artworkDataUrl || seen.has(t.artworkDataUrl)) continue;
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !t.artist.toLowerCase().includes(q) &&
        !t.album.toLowerCase().includes(q)
      ) {
        continue;
      }
      seen.add(t.artworkDataUrl);
      results.push({
        id: t.id,
        label: t.album || t.title,
        sub: t.artist,
        url: t.artworkDataUrl,
      });
    }
    return results;
  }, [allTracks, libraryQuery]);

  if (!track) return null;

  const triggerGenerate = (style: HoloCoverStyle, customSeed: string, nextVariant: number) => {
    const url = generateHoloCoverArt({
      title: track.title,
      artist: track.artist,
      album: track.album,
      style,
      seedText: nextVariant > 0 ? `${customSeed} #${nextVariant}` : customSeed,
    });
    setPreviewUrl(url);
    setPreviewBroken(false);
    setErrorMsg(null);
  };

  const handleDeviceImagePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setErrorMsg(null);
      const croppedUrl = await processDeviceImageFile(file);
      setPreviewUrl(croppedUrl);
      setPreviewBroken(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load image from device.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'var(--surface-overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit Album Art"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleDeviceImagePicked(e)}
        className="hidden"
      />

      <div
        className="holo-dialog-surface flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div
          className="holo-actionbar-surface flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '2px solid var(--accent)' }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <HoloImageEditIcon className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--accent)]">
                Edit Album Art
              </h2>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {track.title} · {track.artist}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close album art editor"
            className="holo-btn flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <HoloCloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Preview + Mode Tabs */}
        <div className="holo-scroll flex-1 overflow-y-auto p-4">
          {isCorrupted && (
            <div
              className="mb-3 border px-3 py-2 text-xs text-[var(--text-banner)]"
              style={{
                borderColor: 'var(--accent)',
                backgroundColor: 'var(--surface-banner)',
              }}
            >
              Embedded artwork was missing or corrupted. Generated cover art is ready below, or
              choose an image from your device.
            </div>
          )}

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Live Square Preview */}
            <div className="theme-artwork-box flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden">
              {previewUrl && !previewBroken ? (
                <img
                  src={previewUrl}
                  alt="Album art preview"
                  onError={() => setPreviewBroken(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <HoloMusicNoteIcon className="h-12 w-12 text-[var(--accent)]" />
              )}
            </div>

            {/* Source Selector Tabs */}
            <div className="w-full min-w-0 flex-1">
              <div
                className="grid grid-cols-3 border border-[var(--divider-strong)]"
                style={{ backgroundColor: 'var(--surface-well)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('generate')}
                  className={`py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'generate'
                      ? 'border-b-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('device')}
                  className={`border-l border-[var(--divider)] py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'device'
                      ? 'border-b-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  From Device
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className={`border-l border-[var(--divider)] py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'library'
                      ? 'border-b-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Search Art
                </button>
              </div>

              {activeTab === 'generate' && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <label
                      htmlFor="cover-seed-input"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                    >
                      Cover Label
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="cover-seed-input"
                        type="text"
                        value={seedText}
                        onChange={(e) => {
                          setSeedText(e.target.value);
                          triggerGenerate(selectedStyle, e.target.value, variantCounter);
                        }}
                        placeholder="Album or track label..."
                        className="min-w-0 flex-1 border-b border-[var(--accent)] bg-transparent py-1 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = variantCounter + 1;
                          setVariantCounter(next);
                          triggerGenerate(selectedStyle, seedText, next);
                        }}
                        className="holo-btn px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"
                      >
                        Shuffle
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Style
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HOLO_COVER_STYLES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(st.id);
                            triggerGenerate(st.id, seedText, variantCounter);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium ${
                            selectedStyle === st.id ? 'holo-btn-primary' : 'holo-btn'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'device' && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    Select a JPG, PNG, or WebP image from your device. It will be square-cropped and
                    saved locally.
                  </p>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="holo-btn-primary flex min-h-[44px] w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold"
                  >
                    <HoloImageEditIcon className="h-4 w-4" />
                    <span>Select Image from Device</span>
                  </button>
                </div>
              )}

              {activeTab === 'library' && (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-[var(--divider-strong)] pb-1">
                    <HoloSearchIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <input
                      type="search"
                      value={libraryQuery}
                      onChange={(e) => setLibraryQuery(e.target.value)}
                      placeholder="Search library covers..."
                      className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none"
                    />
                  </div>

                  {libraryArtMatches.length === 0 ? (
                    <p className="py-3 text-center text-xs text-[var(--text-secondary)]">
                      No matching artwork in library.
                    </p>
                  ) : (
                    <div className="holo-scroll grid max-h-36 grid-cols-4 gap-2 overflow-y-auto pr-1">
                      {libraryArtMatches.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          title={`${item.label} · ${item.sub}`}
                          onClick={() => {
                            setPreviewUrl(item.url);
                            setPreviewBroken(false);
                          }}
                          className="aspect-square overflow-hidden border"
                          style={{
                            borderColor:
                              previewUrl === item.url ? 'var(--accent)' : 'var(--divider-strong)',
                          }}
                        >
                          <img
                            src={item.url}
                            alt={item.label}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 border border-[var(--danger-text)] px-3 py-2 text-xs text-[var(--danger-text)]">
              {errorMsg}
            </div>
          )}

          {albumTrackCount > 1 && (
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 border-t border-[var(--divider)] pt-3 text-xs text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={applyToAlbum}
                onChange={(e) => setApplyToAlbum(e.target.checked)}
                className="h-4 w-4"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>
                Apply to all {albumTrackCount} tracks in &ldquo;{track.album}&rdquo;
              </span>
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-3 border-t border-[var(--divider)]">
          <button
            type="button"
            onClick={() => {
              onSaveArtwork(track, null, albumTrackCount > 1 && applyToAlbum);
              onClose();
            }}
            className="holo-btn min-h-[44px] border-0 border-r border-[var(--divider)] py-3 text-xs font-medium"
            style={{ borderRadius: 0 }}
          >
            Clear Art
          </button>
          <button
            type="button"
            onClick={onClose}
            className="holo-btn min-h-[44px] border-0 border-r border-[var(--divider)] py-3 text-xs font-medium"
            style={{ borderRadius: 0 }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!previewUrl || previewBroken}
            onClick={() => {
              onSaveArtwork(track, previewUrl, albumTrackCount > 1 && applyToAlbum);
              onClose();
            }}
            className="holo-btn-primary min-h-[44px] border-0 py-3 text-xs font-semibold disabled:opacity-40"
            style={{ borderRadius: 0 }}
          >
            Save Cover
          </button>
        </div>
      </div>
    </div>
  );
}
