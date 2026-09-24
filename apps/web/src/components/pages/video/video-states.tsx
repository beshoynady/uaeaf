/**
 * Loading, nothing, and nothing playable -- the three ways this system has of
 * having no video to show.
 *
 * They are one file because they are one decision: a reader hits exactly one
 * of them, and keeping them together is what stops the third from being
 * forgotten when the first two are built.
 */

import { FOCUS } from "@/components/ui/interactive";

/** A card's shape while its row is still arriving. `aria-hidden`, and the
 *  region that holds it carries `aria-busy` -- a screen reader should hear
 *  "loading", once, not six empty articles. */
export const VideoCardSkeleton = ({ reel = false }: { reel?: boolean }) => (
  <div aria-hidden="true" className="flex flex-col gap-3">
    <div
      className="vs-skeleton w-full"
      style={{
        aspectRatio: reel ? "9 / 16" : "16 / 9",
        borderRadius: reel ? "var(--radius-lg)" : "var(--radius-md)",
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
    style={{ border: "1px dashed var(--surface-divider)", borderRadius: "var(--radius-xl)" }}
  >
    <span
      aria-hidden="true"
      className="vs-fill-strong inline-flex size-14 items-center justify-center rounded-full"
    >
      <svg viewBox="0 0 24 24" focusable="false" className="size-6" fill="none" stroke="var(--surface-text-muted)" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="11" cy="11" r="6.2" />
        <path d="m15.6 15.6 3.6 3.6" />
      </svg>
    </span>
    <h3 className="text-h4 font-bold" style={{ color: "var(--surface-text)" }}>
      {title}
    </h3>
    <p className="max-w-md text-body-sm leading-relaxed" style={{ color: "var(--surface-text-muted)" }}>
      {body}
    </p>
    {onClear && clearLabel ? (
      <button
        type="button"
        onClick={onClear}
        className={`inline-flex min-h-11 items-center rounded-[var(--radius-full)] px-6 text-body-sm font-bold transition-[filter] duration-[var(--motion-duration-fast)] hover:brightness-110 ${FOCUS}`}
        style={{ background: "var(--surface-btn-primary-bg)", color: "var(--surface-btn-primary-ink)" }}
      >
        {clearLabel}
      </button>
    ) : null}
  </div>
);
