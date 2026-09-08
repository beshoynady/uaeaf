"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

/**
 * One labelled input, wired for assistive technology once so no form has to
 * remember to do it.
 *
 * `dir="ltr"` is the default on the control regardless of page direction: an
 * email address and a password are LTR strings, and rendering them RTL puts
 * the caret and any punctuation in the wrong place inside an otherwise
 * correct Arabic layout. A field holding natural-language text — a person's
 * Arabic name — overrides it, because that text is not LTR and reversing its
 * reading order is the same defect in the other direction.
 *
 * That default direction is also why the border lives on the wrapper and the
 * trailing control is a flex sibling rather than an absolutely-positioned
 * overlay. An overlay has to reserve space with padding on the input, and
 * the input's padding resolves in *its* direction (always LTR) while the
 * overlay resolves in the *page's* — so in Arabic the reveal button landed
 * on the left while the reserved space sat on the right, and the typed
 * password ran underneath the button. Laying them out as siblings removes
 * the mismatch instead of compensating for it.
 */
export function TextField({
  id,
  label,
  hint,
  error,
  trailing,
  dir = "ltr",
  ...input
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Rendered at the inline end of the control — the reveal button on a
   *  password field. Follows the page's direction, which is where a reader
   *  of that language expects a trailing affordance. */
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const hintId = hint ? `${generated}-hint` : undefined;
  const errorId = error ? `${generated}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-medium text-[color:var(--color-text-secondary)]">
        {label}
      </label>

      <div
        className={[
          "flex h-12 items-center gap-1 rounded-[var(--radius-md)] border bg-[color:var(--color-surface-base)] ps-4 pe-1",
          "transition-[border-color] duration-[var(--motion-duration-fast)]",
          // The ring is drawn here, not on the input, so it surrounds the
          // whole control including the reveal button.
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-[color:var(--a11y-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--a11y-focus-offset)]",
          error
            ? "border-[color:var(--color-semantic-error)]"
            : "border-[color:var(--color-border-default)] focus-within:border-[color:var(--color-border-strong)]",
        ].join(" ")}
      >
        <input
          {...input}
          id={id}
          name={input.name ?? id}
          dir={dir}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-start text-body text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-disabled)]"
        />
        {trailing}
      </div>

      {hint ? (
        <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption font-medium text-[color:var(--color-semantic-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
