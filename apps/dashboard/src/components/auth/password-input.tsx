"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TextField } from "./text-field";
import type { ReactNode } from "react";

/**
 * A password field with a reveal control.
 *
 * WCAG 2.2 SC 3.3.8 (Accessible Authentication) is the reason this exists:
 * a 12-character minimum typed blind, with no way to check it, is a memory
 * test the standard asks us not to impose. The button toggles `type` only —
 * nothing is stored, and `autoComplete` is left to the caller so a password
 * manager still recognises the field.
 */
export function PasswordInput({
  id,
  label,
  autoComplete,
  hint,
  error,
  value,
  onValueChange,
  disabled,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: ReactNode;
  error?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Held while a submit is in flight, so a second edit cannot race the
   *  request that is already carrying the first. */
  disabled?: boolean;
}) {
  const t = useTranslations("Auth");
  const [revealed, setRevealed] = useState(false);

  return (
    <TextField
      id={id}
      label={label}
      type={revealed ? "text" : "password"}
      autoComplete={autoComplete}
      required
      hint={hint}
      error={error}
      value={value}
      disabled={disabled}
      onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
      trailing={
        <button
          type="button"
          disabled={disabled}
          onClick={() => setRevealed((current) => !current)}
          // The state is in the label, not only in the icon: "hide" tells a
          // screen-reader user the password is currently visible, which is
          // the fact that matters in a shared office.
          aria-label={revealed ? t("hidePassword") : t("showPassword")}
          aria-pressed={revealed}
          // `size-11` is 44px — WCAG 2.5.5 and IA §12's KPI floor. It measured
          // 40x40 until the field's shell dropped its own vertical padding
          // (ADR-0067 D5) and left the button room to be the size it should
          // always have been: 44 + the shell's 4px end padding is exactly the
          // control's 48px height.
          className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-caption font-medium text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
        >
          <EyeIcon crossed={revealed} />
        </button>
      }
    />
  );
}

/**
 * Drawn rather than typed. A glyph like ◎ renders at whatever weight the
 * font happens to give it — faint, and different in Alexandria and IBM Plex
 * — where an SVG stroke inherits the button's colour and sits at the token
 * icon size (--icon-size-sm, 20px).
 */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-[var(--icon-size-sm)]"
    >
      <path d="M1.7 10S4.9 4.6 10 4.6 18.3 10 18.3 10 15.1 15.4 10 15.4 1.7 10 1.7 10Z" />
      <circle cx="10" cy="10" r="2.4" />
      {crossed ? <path d="M3.5 16.5 16.5 3.5" /> : null}
    </svg>
  );
}
