"use client";

import { memo } from "react";

import type { ReactNode } from "react";

/**
 * An on/off setting: a native checkbox exposed as a switch.
 *
 * Native, so it is keyboard-operable and labelled by its `<label>` without any
 * script; `role="switch"` tells a screen reader that it turns something on or
 * off rather than ticking an item in a list. The whole row is the target
 * (44px or more).
 *
 * -- Why it lives in `ui/` --------------------------------------------------
 *
 * It was `components/admin/homepage-hero/switch-field.tsx` while one screen
 * used it, and stayed there while seven did -- the hero's three editors, the
 * news policy detail, and the three sponsor-relations editors. A component
 * seven unrelated screens import from one screen's folder reads as that
 * screen's private part, which is how the eighth consumer ends up writing a
 * raw checkbox instead. Moved unchanged, for the same reason and by the same
 * precedent as `FormSection`; this is the same markup it always drew.
 */
const SwitchFieldView = ({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  labelHidden = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
  /**
   * Keeps the accessible name and drops the visible one.
   *
   * For a switch inside a row that already names what it controls — a section
   * in a list — where a visible label would say the same word twice. The name
   * is never dropped, only hidden: a switch announced as just "switch" tells a
   * screen-reader user nothing about which of nine sections it turns off.
   */
  labelHidden?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-md)] px-1 text-label font-medium text-[color:var(--color-text-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-[var(--opacity-disabled)]"
    >
      <span className={labelHidden ? "sr-only" : undefined}>{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-[var(--radius-full)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-sunken)] transition-colors duration-[var(--motion-duration-fast)] before:absolute before:top-0.5 before:size-[18px] before:rounded-[var(--radius-full)] before:bg-[color:var(--color-text-secondary)] before:transition-[inset-inline-start] before:duration-[var(--motion-duration-fast)] before:content-[''] before:[inset-inline-start:2px] checked:border-[color:var(--color-brand-primary)] checked:bg-[color:var(--color-brand-primary)] checked:before:bg-[color:var(--color-text-on-brand)] checked:before:[inset-inline-start:22px] hover:border-[color:var(--color-brand-primary)] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] disabled:cursor-not-allowed"
      />
    </label>
    {hint ? (
      <p id={`${id}-hint`} className="px-1 text-caption text-[color:var(--color-text-muted)]">
        {hint}
      </p>
    ) : null}
  </div>
);

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const SwitchField = memo(SwitchFieldView);
