"use client";

import { UiIcon } from "@/lib/icons/ui-icons";
import { BUTTON_SECONDARY } from "./interactive";

/**
 * Moving through a list that does not fit on one screen.
 *
 * -- Previous and next, not a row of numbers --------------------------------
 *
 * A numbered pager is worth its complexity when a reader has a reason to jump
 * to page 7 — a public archive, a search result they have seen before. An
 * administration list ordered by date has no such reason: the page numbers
 * mean nothing stable, because adding one record shifts every one of them.
 * Two buttons and a position are the honest controls for it.
 *
 * -- Announced, because nothing else says the list changed ------------------
 *
 * The rows above swap out with no navigation and no focus move, so the
 * position line is a live region. Without it, a screen-reader user presses
 * Next and hears nothing at all.
 */
export const Pagination = ({
  page,
  pageCount,
  onChange,
  labels,
  busy = false,
}: {
  /** 1-based. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  labels: { previous: string; next: string; position: string; label: string };
  busy?: boolean;
}) => {
  // One page is not a pager. Drawing two disabled arrows under every short
  // list is furniture that says "there is more" when there is not.
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={labels.label} className="flex items-center justify-between gap-4 pt-2">
      <button type="button" onClick={() => onChange(page - 1)} disabled={busy || page <= 1} className={`${BUTTON_SECONDARY} gap-2`}>
        {/* Mirrored in Arabic: this one points the way the reader is going. */}
        <UiIcon name="chevron-right" className="size-[var(--icon-size-xs)] rtl:-scale-x-100 ltr:rotate-180" />
        {labels.previous}
      </button>

      <p role="status" aria-live="polite" className="text-body-sm text-[color:var(--color-text-secondary)]">
        {labels.position}
      </p>

      <button type="button" onClick={() => onChange(page + 1)} disabled={busy || page >= pageCount} className={`${BUTTON_SECONDARY} gap-2`}>
        {labels.next}
        <UiIcon name="chevron-right" className="size-[var(--icon-size-xs)] rtl:-scale-x-100" />
      </button>
    </nav>
  );
};
