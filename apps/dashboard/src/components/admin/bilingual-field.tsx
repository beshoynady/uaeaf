"use client";

import { TextField } from "@/components/auth/text-field";
import { FieldLabel } from "@/components/ui/required-field";

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
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {multiline ? (
          <>
            <TextArea
              id={`${id}-ar`}
              label={labelAr}
              dir="rtl"
              value={valueAr}
              required={required}
              disabled={disabled}
              onChange={onChangeAr}
            />
            <TextArea
              id={`${id}-en`}
              label={labelEn}
              dir="ltr"
              value={valueEn}
              required={required}
              disabled={disabled}
              onChange={onChangeEn}
            />
          </>
        ) : (
          <>
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
          </>
        )}
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
        // Vertical resize only: the two halves sit in a two-column grid, and
        // dragging one wider would push it out of its own cell.
        className={`field-control min-h-[84px] resize-y border border-[color:var(--color-border-strong)] text-body outline-none transition-[border-color] duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-brand-primary)] active:border-[color:var(--color-brand-primary)] focus:border-[color:var(--color-brand-primary)] focus-visible:border-[color:var(--color-brand-primary)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]`}
      />
    </div>
  );
}
