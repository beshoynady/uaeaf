/**
 * The space a person's photograph occupies, whether or not there is one.
 *
 * Every portrait on these pages is pending: the federation has sent no
 * official photographs, so each record's `photoId` is empty. The slot is
 * therefore the ordinary state rather than an error, and it has to hold its
 * own shape — a card whose picture collapses to nothing re-flows the day the
 * photographs arrive, which is the layout shift Chapter 5 §5.9 budgets
 * against.
 *
 * The silhouette is drawn, not illustrated. Chapter 27 §31 leaves the system
 * with no illustration style, and a decorative stand-in for a person would be
 * inventing one.
 */

export type PortraitShape = "circle" | "panel";

export const Portrait = ({
  shape,
  label,
  className = "",
}: {
  shape: PortraitShape;
  /** Named for the reader: "official photo pending". */
  label: string;
  className?: string;
}) => (
  <div
    data-part="portrait"
    data-shape={shape}
    className={`relative grid place-items-center overflow-hidden border border-dashed border-[color:var(--surface-tile-edge)] bg-[color:var(--surface-tile-fill)] ${
      shape === "circle" ? "rounded-[var(--radius-full)]" : "rounded-[var(--radius-lg)]"
    } ${className}`}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-1/2 text-[color:var(--surface-text-muted)]"
    >
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>

    {/* Named in place on a panel, where there is room; announced only on a
        circle, where a caption would crowd the name beside it. */}
    {shape === "panel" ? (
      <span className="absolute start-[var(--space-3)] top-[var(--space-3)] rounded-[var(--radius-sm)] bg-[color:var(--surface-bg)] px-[var(--space-2)] py-[var(--space-1)] text-label text-[color:var(--surface-text-muted)]">
        {label}
      </span>
    ) : (
      <span className="brand-visually-hidden">{label}</span>
    )}
  </div>
);
