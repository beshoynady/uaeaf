/**
 * A chevron that points along the reading direction: `forward` the way a line
 * of text runs, `back` the way it came. One glyph, mirrored per direction, so
 * a control reads the same in Arabic and English without two drawings.
 */
export const ChevronIcon = ({
  direction,
  className = "size-4",
}: {
  direction: "forward" | "back";
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={`shrink-0 ${direction === "forward" ? "rtl:-scale-x-100" : "ltr:-scale-x-100"} ${className}`}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);
