/**
 * The two Lucide glyphs this page draws, inline (ADR-0068): no icon package,
 * the stroke inherits the text colour, and both are hidden from assistive
 * technology because the link text beside them already says where they go.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Lucide `arrow-right`, turned to face the reading direction in RTL. */
export const ArrowForwardIcon = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" {...STROKE} className={`rtl:-scale-x-100 ${className}`}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/** Lucide `arrow-down`, for a link that moves down the same page. */
export const ArrowDownIcon = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" {...STROKE} className={className}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
);
