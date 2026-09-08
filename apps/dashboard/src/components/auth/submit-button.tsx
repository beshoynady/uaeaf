"use client";

import type { ReactNode } from "react";

/**
 * The one primary action on each auth screen.
 *
 * Green because Chapter 5 of the visual protocol reserves the brand green
 * for the primary CTA — it is the only place on these screens the brand
 * colour appears, which is what keeps a "neutral dominant" page still
 * recognisably UAEAF.
 *
 * The busy state changes the label rather than swapping in a spinner: the
 * text is announced, a spinner is not, and `aria-busy` tells assistive
 * technology the same thing the label does.
 */
export function SubmitButton({
  busy,
  disabled,
  busyLabel,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  busyLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy}
      className="mt-2 flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)]"
    >
      {busy ? busyLabel : children}
    </button>
  );
}
