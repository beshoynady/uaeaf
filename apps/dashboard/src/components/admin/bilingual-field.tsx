"use client";

import { TextField } from "@/components/auth/text-field";

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
              disabled={disabled}
              onChange={onChangeAr}
            />
            <TextArea
              id={`${id}-en`}
              label={labelEn}
              dir="ltr"
              value={valueEn}
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
        <p role="alert" className="text-caption font-medium text-[color:var(--color-semantic-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextArea({
  id,
  label,
  dir,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  dir: "rtl" | "ltr";
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-medium text-[color:var(--color-text-secondary)]">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        rows={3}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        // Vertical resize only: the two halves sit in a two-column grid, and
        // dragging one wider would push it out of its own cell.
        className="min-h-[84px] resize-y rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-4 py-3 text-body text-[color:var(--color-text-primary)] outline-none transition-[border-color] duration-[var(--motion-duration-fast)] focus-visible:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]"
      />
    </div>
  );
}
