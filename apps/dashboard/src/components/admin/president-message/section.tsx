"use client";

import type { ReactNode } from "react";

/**
 * One numbered, collapsible part of a long form.
 *
 * `<details>`/`<summary>` rather than a hand-built disclosure: it is
 * keyboard-operable, announces its own expanded state, and survives with no
 * JavaScript at all. The heading sits *inside* the summary so the form can
 * still be navigated by headings — a six-section form whose headings are
 * plain text gives a screen-reader user no way to skim it.
 *
 * Open by default, every one of them. The approved layout shows all six
 * expanded, and an author arriving at a message they have not written before
 * should see what it is made of rather than six closed drawers. Collapsing
 * is for narrowing down once they know.
 */
export function EditorSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
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
          aria-hidden="true"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-sunken)] text-caption font-bold text-[color:var(--color-text-secondary)]"
        >
          {number}
        </span>

        <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">{title}</h3>
      </summary>

      <div className="flex flex-col gap-5 border-t border-[color:var(--color-border-default)] px-4 py-5">
        {children}
      </div>
    </details>
  );
}
