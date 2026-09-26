import type { ReactNode } from "react";

/**
 * The line icons of an album's meta rows — the featured album and the album
 * hero — at the stroke weight the card uses for the same three meanings.
 *
 * All decorative: the text beside each one says what it marks, and a visually
 * hidden label names the field for a screen reader. The colour is the
 * surface's green ink tier (`--surface-accent`), which only the ink surface
 * publishes; anywhere else it falls back to the surface's own ink.
 */

const ICON =
  "size-4 shrink-0 text-[color:var(--surface-accent,var(--surface-text))]";

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    className={ICON}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const CalendarIcon = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const PinIcon = () => (
  <Svg>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const PhotoIcon = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5-5-8 8" />
  </Svg>
);

/** The "go" arrow of the featured album's button. Drawn pointing forward in
 *  the reading direction: right in English, mirrored to left in Arabic. */
export const ForwardArrow = () => (
  <svg
    className="size-4 shrink-0 rtl:-scale-x-100"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
