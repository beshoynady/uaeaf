"use client";

import type { ReactNode } from "react";

/**
 * The bar a long form's actions live on, pinned to the top of the scroll.
 *
 * ── Why it is shared ───────────────────────────────────────────────────────
 *
 * The same class string was written out three times — the editorial shell, the
 * article editor's create branch and the president's message editor — and two
 * further variants drifted from it elsewhere. A bar copied five times is five
 * chances for one screen's actions to sit at a different height, a different
 * elevation, or under a different z-index than the rest.
 *
 * ── Why `status` is a region and not a sentence ────────────────────────────
 *
 * The left slot reports a standing fact that changes without the reader
 * asking for it — "unsaved", "3 fields left". `role="status"` announces the
 * change once, politely, without moving focus. The caller passes the words;
 * this owns only where they sit and that they are announced.
 */
export const StickyFormActions = ({
  status,
  statusProps,
  children,
}: {
  /** The standing fact: saved state, or what is still missing. Announced
   *  politely when it changes. */
  status: ReactNode;
  /**
   * Extra attributes for the status region itself.
   *
   * They belong on the element that carries `role="status"`, not on a wrapper
   * around it: `EditorShell` marks that region `data-dirty`, and its tests
   * find it by asking for the status role AND that attribute. Splitting the
   * two across two elements broke those tests and, more to the point, would
   * have left the attribute describing a node that is not the live region.
   */
  statusProps?: Record<string, string | boolean | undefined>;
  /** The actions themselves, at the reading end of the bar. */
  children: ReactNode;
}) => (
  <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-3">
    <div role="status" {...statusProps} className="text-label text-[color:var(--color-text-secondary)]">
      {status}
    </div>

    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);
