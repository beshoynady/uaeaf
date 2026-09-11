"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { FIELD_BOX } from "@/components/ui/interactive";
import { FieldLabel } from "@/components/ui/required-field";

/**
 * One labelled input, wired for assistive technology once so no form has to
 * remember to do it.
 *
 * ── The label is printed on the control's own edge ─────────────────────────
 *
 * The same field the public site uses (ADR-0066 §D6, extended to this surface
 * by ADR-0067). At rest the label sits inside the control at reading size; on
 * focus or once there is an answer it travels to the top border and the
 * outline opens a notch for it — and it stays there, readable while typing,
 * while correcting, and while reading a filled form back. The DOM order is
 * unchanged, which Chapter 8 L2 §F.1 makes a MUST: only the painted position
 * moves, and it moves by `transform`, never by `top`.
 *
 * The mechanism is `forms.css` in the token package, imported by both
 * applications. Nothing about a field is decided here.
 *
 * ── Direction ─────────────────────────────────────────────────────────────
 *
 * `dir="ltr"` is the default on the control regardless of page direction: an
 * email address and a password are LTR strings, and rendering them RTL puts
 * the caret and any punctuation in the wrong place inside an otherwise
 * correct Arabic layout. A field holding natural-language text — a person's
 * Arabic name — overrides it, because that text is not LTR and reversing its
 * reading order is the same defect in the other direction.
 *
 * That default direction is also why the trailing control is a flex sibling
 * rather than an absolutely-positioned overlay. An overlay has to reserve
 * space with padding on the input, and the input's padding resolves in *its*
 * direction (always LTR) while the overlay resolves in the *page's* — so in
 * Arabic the reveal button landed on the left while the reserved space sat on
 * the right, and the typed password ran underneath the button.
 */
export function TextField({
  id,
  label,
  hint,
  error,
  trailing,
  dir = "ltr",
  required,
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
    <div className={`field flex flex-col gap-2${error ? " field-invalid" : ""}`}>
      {/* First in the DOM (§F.1) and painted onto the control's edge by
          `forms.css`. §F.4's pairing comes from one prop: `FieldLabel` draws
          the glyph and `aria-required` below is its programmatic half, so no
          call site is in a position to supply one and forget the other —
          which is how this dashboard came to break the rule in both
          directions at once, with the auth fields carrying neither and the
          media uploader carrying the glyph on three labels and the attribute
          on none. */}
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>

      <div className={FIELD_BOX}>
        <input
          {...input}
          id={id}
          name={input.name ?? id}
          dir={dir}
          // A field with no `placeholder` attribute can never match
          // `:placeholder-shown`, which is what tells `forms.css` the control
          // is still empty — without one the label floats on first paint and
          // never returns. A space satisfies the selector and shows nothing.
          placeholder={input.placeholder ?? " "}
          required={required}
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="text-body text-[color:var(--color-text-primary)] disabled:cursor-not-allowed"
        />
        {trailing}
      </div>

      {hint ? (
        <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {/* Primary ink for the same reason the public form uses it:
          `--color-semantic-error` is #E53E3E, which measures 3.95:1 on the
          dark theme's raised surface and fails WCAG 1.4.3 at this size. The
          field's edge stays red. DESIGN SYSTEM GAP — ADR-0067 §D8. */}
      {error ? (
        <p id={errorId} className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
