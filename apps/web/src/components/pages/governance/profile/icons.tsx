import type { ReactNode } from "react";

/**
 * The profile's Lucide glyphs, inline (ADR-0068).
 *
 * Every one is decorative: the text beside it carries the meaning, so the glyph
 * is hidden and takes its colour from the text it sits next to.
 */
const Glyph = ({ className = "", children }: { className?: string; children: ReactNode }) => (
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

export const MailIcon = () => (
  <Glyph>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Glyph>
);

export const PhoneIcon = () => (
  <Glyph>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Glyph>
);

export const ArrowDownIcon = () => (
  <Glyph>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Glyph>
);

/** Points the way the line reads, so it turns over in Arabic. */
export const ArrowForwardIcon = () => (
  <Glyph className="rtl:-scale-x-100">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Glyph>
);
