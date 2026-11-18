import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function HoloPlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 5v14l11-7z" />
    </svg>
  );
}

export function HoloPauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

export function HoloPrevIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5 6h2.5v12H5zm3.5 6 9.5 6V6z" />
    </svg>
  );
}

export function HoloNextIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.5 6H19v12h-2.5zM6 18l9.5-6L6 6z" />
    </svg>
  );
}

export function HoloSearchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

export function HoloSortIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 6h18v2.2H3zm0 5h12v2.2H3zm0 5h7v2.2H3z" />
    </svg>
  );
}

export function HoloEqualizerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5 4h2v7H5zm0 11h2v5H5zm-1.5-3.5h5v2.5h-5zM11 4h2v3h-2zm0 7h2v9h-2zm-1.5-3.5h5V10h-5zM17 4h2v11h-2zm0 15h2v1h-2zm-1.5-3.5h5V18h-5z" />
    </svg>
  );
}

export function HoloFolderMusicIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 5h6.5l2 2H21v12H3V5zm10.5 4.2v4.35a2.1 2.1 0 1 0 1.4 1.98V11.2h2.4V9.2h-3.8z" />
    </svg>
  );
}

export function HoloMusicNoteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}

export function HoloShuffleIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 4h4v4M4 18h4l8-12h4M16 20h4v-4M4 6h4l2.5 3.8M13.5 14.2 16 18h4" />
    </svg>
  );
}

export function HoloRepeatIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H4" />
    </svg>
  );
}

export function HoloPlaylistAddIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 6h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm13 0v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z" />
    </svg>
  );
}

export function HoloBackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.4 17.4 10 12l5.4-5.4L14 5l-7 7 7 7z" />
    </svg>
  );
}

export function HoloTrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6 7h12v13H6V7zm3-3h6l1 1.5h3V7H5V5.5h3L9 4z" />
    </svg>
  );
}

export function HoloCloseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function HoloImageEditIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 5h16v14H4V5zm2 2v10h12V7H6zm2.5 8 2.8-3.5 2.1 2.5 2.6-3.2L17 15H8.5zm1-5.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
    </svg>
  );
}

export function HoloSettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94l-.36-2.54a.49.49 0 0 0-.49-.42h-3.84a.49.49 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.24 0 .44-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}

export function HoloCollapseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
    </svg>
  );
}

export function HoloVinylIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <circle cx="32" cy="32" r="28" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
      <circle cx="32" cy="32" r="15" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
      <circle cx="32" cy="32" r="9" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="2.5" fill="currentColor" />
    </svg>
  );
}
