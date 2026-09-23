"use client";

import type { ReactNode } from "react";

/**
 * One collapsible part of a long form.
 *
 * `<details>`/`<summary>` rather than a hand-built disclosure: it is
 * keyboard-operable, announces its own expanded state, and survives with no
 * JavaScript at all. The heading sits *inside* the summary so the form can
 * still be navigated by headings — a six-section form whose headings are
 * plain text gives a screen-reader user no way to skim it.
 *
 * Open by default, every one of them. The approved layout shows all of them
 * expanded, and an author arriving at a record they have not written before
 * should see what it is made of rather than a row of closed drawers.
 * Collapsing is for narrowing down once they know.
 *
 * ── Why it lives in `ui/` ──────────────────────────────────────────────────
 *
 * It was `components/admin/president-message/section.tsx` while one editor
 * used it, and stayed there while four did — the article editor, the
 * president's message, the strategic plan and vision & mission. A component
 * four unrelated screens import from one screen's folder reads as that
 * screen's private part, which is how the fifth consumer ends up copying it
 * instead. Moved unchanged; this is the same markup it always drew.
 */
export const FormSection = ({
  number,
  title,
  children,
  complete,
  completeLabel,
}: {
  number: number;
  title: string;
  children: ReactNode;
  /**
   * Whether everything this part REQUIRES has been filled in.
   *
   * Omitted entirely by the editors that have no per-part requirement, and the
   * badge then stays the plain number it always was. Where it is given, the
   * number becomes a tick — the position in the sequence is what the number
   * said, and once a part is done "where am I" matters less than "is this one
   * finished", which is the question an author scanning a collapsed form is
   * actually asking.
   */
  complete?: boolean;
  /** The tick in words. A shape alone cannot carry meaning (WCAG 1.4.1). */
  completeLabel?: string;
}) => (
  <details
    open
    className="group rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]"
  >
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-md)] px-4 py-2 transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]">
      {/* The marker points along the reading direction when closed and
          down when open, so it never contradicts an RTL layout. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4 shrink-0 rotate-0 transition-transform duration-[var(--motion-duration-fast)] group-open:rotate-90 motion-reduce:transition-none rtl:-scale-x-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 3 5 5-5 5" />
      </svg>

      <span
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
          complete
            ? "bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
            : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]"
        }`}
      >
        {complete ? (
          <>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 8.5 3.5 3.5L13 5" />
            </svg>
            <span className="sr-only">{completeLabel}</span>
          </>
        ) : (
          <span aria-hidden="true">{number}</span>
        )}
      </span>

      <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">{title}</h3>
    </summary>

    <div className="flex flex-col gap-5 border-t border-[color:var(--color-border-default)] px-4 py-5">
      {children}
    </div>
  </details>
);
