import type { ReactNode } from "react";

/**
 * The committee page's icons, as inline Lucide paths (ADR-0068).
 *
 * Decorative in every use: each sits beside text or inside a control that
 * carries its own accessible name, so all are `aria-hidden` and take
 * `currentColor` from the surface around them.
 */

const Icon = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`size-[var(--space-5)] shrink-0 ${className}`}
  >
    {children}
  </svg>
);

/** Lucide `file-text`. */
export const FileIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </Icon>
);

/** Lucide `download`. */
export const DownloadIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

/** Lucide `arrow-right`, turned to point forward in Arabic. */
export const ForwardIcon = ({ className = "" }: { className?: string }) => (
  <Icon className={`rtl:-scale-x-100 ${className}`}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

/** Lucide `git-fork` turned upward: a line to the body above. */
export const ReportsIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
    <path d="M12 12v3" />
  </Icon>
);
