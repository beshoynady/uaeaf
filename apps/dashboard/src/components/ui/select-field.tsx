"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { FIELD_SELECT } from "./interactive";
import { FieldLabel } from "./required-field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/**
 * One labelled `<select>`, in the same field the rest of both applications use.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * There were five selects on this dashboard — the page editor's register, the
 * new-user form's person, the user directory's two filters, the status
 * control — and no two of them agreed. Three stood 40px tall against WCAG
 * 2.5.8's 44px floor; two hid their label from sighted readers behind
 * `sr-only` and left an unlabelled dropdown in a toolbar; all five drew
 * `--color-border-default`, which measures **1.15:1** on the raised surface
 * where §1.4.11 requires 3:1. None of that was chosen; it is what a control
 * copied five times looks like after five edits.
 *
 * ── The label rests where the answer will be ──────────────────────────────
 *
 * Identical to `TextField`, because a select is not a visual exception —
 * ADR-0067 §D6. At rest the label sits inside the control; once a real answer
 * is selected it travels to the top border and the outline opens a notch for
 * it. `forms.css` in the token package reads `option[value=""]:disabled:
 * checked` to know which of those two states the control is in, so a select
 * that arrives with a value simply starts floated — which is right, because
 * it is already answered.
 *
 * ── The chevron is painted, not laid out ──────────────────────────────────
 *
 * It sits over the control's own end padding rather than beside it as a flex
 * sibling. A sibling would take its width out of the control's hit area, and
 * a chevron is a picture of what pressing the control already does — a reader
 * who aims at it and gets nothing has been told a lie by the affordance. It
 * is `pointer-events-none` for the same reason, and positioned with `end-`
 * so it crosses to the other side in Arabic along with the `pe-11` that
 * reserves its room.
 */
export function SelectField({
  id,
  label,
  options,
  hint,
  error,
  placeholder,
  required,
  className,
  ...select
}: {
  id: string;
  label: string;
  options: ReadonlyArray<SelectOption>;
  hint?: ReactNode;
  error?: string | null;
  /**
   * Renders a disabled empty option first, so the field rests with its label
   * in the middle and nothing pre-answered.
   *
   * Omit it for a select that always has an answer — a filter, a status, a
   * setting. Passing `true` where the first real option would do just as well
   * costs the reader a decision they did not need to make.
   *
   * Plain and selectable — not `disabled`, not `hidden`. The HTML Standard's
   * "ask for a reset" step selects the first option in tree order *that is
   * not disabled*, so both of those markers hand a required field a real
   * answer it was never given. `data-placeholder` carries the meaning
   * instead, and no browser behaviour reads it.
   */
  placeholder?: boolean;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field flex flex-col gap-2${error ? " field-invalid" : ""}`}>
      {/* First in the DOM (§F.1); `forms.css` paints it onto the edge. */}
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>

      <div className="relative">
        <select
          {...select}
          id={id}
          name={select.name ?? id}
          required={required}
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${FIELD_SELECT}${className ? ` ${className}` : ""}`}
        >
          {placeholder ? <option value="" data-placeholder /> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown />
      </div>

      {hint ? (
        <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {/* Primary ink, not `--color-semantic-error`: #E53E3E measures 3.95:1 on
          the dark theme's raised surface and fails WCAG 1.4.3 at this size.
          The field's edge and its label stay red, so 1.4.1 holds without the
          sentence being red as well. DESIGN SYSTEM GAP — ADR-0067 §D8. */}
      {error ? (
        <p id={errorId} className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4.5 text-[color:var(--color-text-secondary)]"
    >
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}
