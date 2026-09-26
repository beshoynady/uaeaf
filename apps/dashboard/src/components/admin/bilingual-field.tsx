"use client";

import type { ReactNode } from "react";
import { TextField } from "@/components/auth/text-field";
import { FieldLabel } from "@/components/ui/required-field";
import { FIELD_TEXTAREA } from "@/components/ui/interactive";

/**
 * One value, recorded in both languages.
 *
 * Every user-facing name in this platform is bilingual — a staff member's
 * name, a role's name — because the dashboard is used in both and a record
 * that exists in one is unreadable in the other. So the two halves are one
 * field with two inputs, not two unrelated fields: they are filled together,
 * they fail together, and the API rejects the pair if either half is blank.
 *
 * Each input carries its own direction. Arabic text in an LTR input has its
 * reading order reversed, and an English name in an RTL one puts the caret
 * on the wrong side — the same defect twice, in opposite directions.
 */
export function BilingualField({
  id,
  labelAr,
  labelEn,
  valueAr,
  valueEn,
  onChangeAr,
  onChangeEn,
  hint,
  error,
  disabled,
  required,
  multiline,
  footerAr,
  footerEn,
}: {
  id: string;
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
  onChangeAr: (value: string) => void;
  onChangeEn: (value: string) => void;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  /** For prose rather than a name. A description runs to a sentence or two
   *  and a single-line input hides everything past its own width. */
  multiline?: boolean;
  /**
   * Anything that belongs to ONE half of the pair, under that half's input —
   * a character counter, most often.
   *
   * These exist because a caller could not put anything under one column
   * before. The grid closes inside this component, so everything a caller
   * rendered afterwards became a full-width row beneath BOTH inputs, laid out
   * from the inline-start edge — which put both of an SEO field's counters
   * under the Arabic column and left the English one with none.
   *
   * Two explicit props rather than one render-prop: the caller already knows
   * which language each belongs to, and naming them is simpler to read at the
   * call site than a function that has to be told.
   */
  footerAr?: ReactNode;
  footerEn?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Each column is its own stack, so whatever belongs to one language —
          its input and its footer — stays over that language's column. The
          two inputs used to be direct children of this grid, which left a
          caller no way to put anything under just one of them. */}
      {/* Side by side from a **content** width of 1024px, stacked below it
          (owner brief §4). `sm:grid-cols-2` alone was a screen breakpoint, and
          on the editor screens the screen is not what decides: at 1280 the
          signed-in sidebar takes 240 and the section rail 290, leaving the
          fields about 660 — two columns of 287 each, which is a field nobody
          can read a headline in.

          `@max-5xl/editor` matches only inside the editor shell's declared
          container (`@container/editor`), so every other screen keeps the
          behaviour it had. 5xl is Tailwind's 64rem — 1024px, the width the
          brief names. */}
      <div className="grid gap-4 sm:grid-cols-2 @max-5xl/editor:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          {multiline ? (
            <TextArea
              id={`${id}-ar`}
              label={labelAr}
              dir="rtl"
              value={valueAr}
              required={required}
              disabled={disabled}
              onChange={onChangeAr}
            />
          ) : (
            <TextField
              id={`${id}-ar`}
              label={labelAr}
              dir="rtl"
              lang="ar"
              value={valueAr}
              required={required}
              disabled={disabled}
              onChange={(event) => onChangeAr(event.target.value)}
            />
          )}
          {footerAr}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          {multiline ? (
            <TextArea
              id={`${id}-en`}
              label={labelEn}
              dir="ltr"
              value={valueEn}
              required={required}
              disabled={disabled}
              onChange={onChangeEn}
            />
          ) : (
            <TextField
              id={`${id}-en`}
              label={labelEn}
              dir="ltr"
              lang="en"
              value={valueEn}
              required={required}
              disabled={disabled}
              onChange={(event) => onChangeEn(event.target.value)}
            />
          )}
          {footerEn}
        </div>
      </div>

      {hint ? <p className="text-caption text-[color:var(--color-text-muted)]">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The multi-line half of the same field.
 *
 * Same mechanism as `TextField` — `forms.css` in the token package draws the
 * notch and moves the label — with the one difference a textarea forces:
 * `.field-textarea` puts the label on the *first line* rather than the
 * vertical centre, because a box three rows tall has no single line to be
 * centred against.
 */
function TextArea({
  id,
  label,
  dir,
  value,
  required,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  dir: "rtl" | "ltr";
  value: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field field-textarea flex flex-col gap-2">
      {/* `required` reaches this half now. It did not before: `BilingualField`
          threaded it to its single-line inputs and dropped it here, so a
          required *description* carried no glyph, no `aria-required` and no
          native `required` — §F.4 broken by omission rather than by half, on
          the only field kind where nobody noticed. */}
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        name={id}
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        rows={3}
        value={value}
        required={required}
        aria-required={required ? true : undefined}
        disabled={disabled}
        // Without a placeholder attribute `:placeholder-shown` can never
        // match, and the label would float on first paint and stay there.
        placeholder=" "
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_TEXTAREA}
      />
    </div>
  );
}
