/**
 * Loading, nothing, and nothing playable -- the three ways this system has of
 * having no video to show.
 *
 * They are one file because they are one decision: a reader hits exactly one
 * of them, and keeping them together is what stops the third from being
 * forgotten when the first two are built.
 */

/** A card's shape while its row is still arriving. `aria-hidden`, and the
 *  region that holds it carries `aria-busy` -- a screen reader should hear
 *  "loading", once, not six empty articles. */
export const VideoCardSkeleton = ({ reel = false }: { reel?: boolean }) => (
  <div aria-hidden="true" className="flex flex-col gap-3">
    <div
      className="vs-skeleton w-full"
      style={{
        aspectRatio: reel ? "9 / 16" : "16 / 9",
        borderRadius: reel ? "var(--vs-radius-reel)" : "var(--vs-radius-card)",
      }}
    />
    {reel ? null : (
      <>
        <div className="vs-skeleton h-4 w-full rounded-full" />
        <div className="vs-skeleton h-4 w-3/5 rounded-full" />
        <div className="vs-skeleton h-3 w-2/5 rounded-full" />
      </>
    )}
  </div>
);

export const VideoGridSkeleton = ({ count = 6, label }: { count?: number; label: string }) => (
  <div role="status" aria-live="polite" aria-busy="true" className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
    <span className="sr-only">{label}</span>
    {Array.from({ length: count }, (_, index) => (
      <VideoCardSkeleton key={index} />
    ))}
  </div>
);

/**
 * No video matched.
 *
 * The clear control is offered only when something is actually filtering --
 * an empty library with a "clear filters" button under it tells the reader
 * their filters are the problem when there is nothing to find either way.
 */
export const VideoEmptyState = ({
  title,
  body,
  clearLabel,
  onClear,
}: {
  title: string;
  body: string;
  clearLabel?: string;
  onClear?: () => void;
}) => (
  <div
    className="flex flex-col items-center gap-4 px-6 py-16 text-center"
    style={{ border: "1px dashed var(--vs-hairline)", borderRadius: "var(--vs-radius-player)" }}
  >
    <span
      aria-hidden="true"
      className="inline-flex size-14 items-center justify-center rounded-full"
      style={{ background: "var(--vs-surface-raised)" }}
    >
      <svg viewBox="0 0 24 24" focusable="false" className="size-6" fill="none" stroke="var(--vs-text-secondary)" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.2" />
        <path d="m15.6 15.6 3.6 3.6" />
      </svg>
    </span>
    <h3 className="text-h4 font-bold" style={{ color: "var(--vs-text)" }}>
      {title}
    </h3>
    <p className="max-w-md text-body-sm leading-relaxed" style={{ color: "var(--vs-text-secondary)" }}>
      {body}
    </p>
    {onClear && clearLabel ? (
      <button
        type="button"
        onClick={onClear}
        className="inline-flex min-h-11 items-center rounded-[var(--vs-radius-pill)] px-6 text-body-sm font-bold transition-[filter] duration-[var(--motion-duration-fast)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vs-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vs-bg)]"
        style={{ background: "var(--vs-green)", color: "var(--vs-on-green)" }}
      >
        {clearLabel}
      </button>
    ) : null}
  </div>
);
