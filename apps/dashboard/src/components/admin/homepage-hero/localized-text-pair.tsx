"use client";

import { memo, useId } from "react";
import { useTranslations } from "next-intl";
import { graphemeLength } from "@uaeaf/content/hero";
import { TextField } from "@/components/auth/text-field";
import { FIELD_TEXTAREA } from "@/components/ui/interactive";
import { FieldLabel } from "@/components/ui/required-field";
import type { Bilingual, FieldError } from "@/lib/admin/homepage-hero";
import { errorAt, fieldMessage } from "./field-errors";

/**
 * One text in both languages, side by side: Arabic, then English.
 *
 * Each half has its own label, its own count towards the limit measured at
 * 390px, and its own error, wired with `aria-invalid` and `aria-describedby` so
 * a screen reader hears the count and the problem with the field it belongs to.
 * The count is characters as a reader counts them (`graphemeLength`), the same
 * count the API applies.
 */
const LocalizedTextPairView = ({
  id,
  label,
  value,
  onChange,
  limit,
  linesHint,
  errors,
  errorPath,
  multiline = false,
}: {
  id: string;
  label: string;
  value: Bilingual;
  onChange: (value: Bilingual) => void;
  limit: number;
  linesHint: string;
  errors: readonly FieldError[];
  /** The error path without the language, e.g. `slides.<key>.title`. */
  errorPath: string;
  multiline?: boolean;
}) => {
  const t = useTranslations("HomepageHero");
  const halves = [
    { language: "ar" as const, dir: "rtl" as const, name: t("inArabic") },
    { language: "en" as const, dir: "ltr" as const, name: t("inEnglish") },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {halves.map(({ language, dir, name }) => {
        const count = graphemeLength(value[language]);
        const hint = `${t("characters", { count, max: limit })} · ${linesHint}`;
        const error = fieldMessage(t, errorAt(errors, `${errorPath}.${language}`));
        const fieldId = `${id}-${language}`;
        const change = (text: string) => onChange({ ...value, [language]: text });
        return multiline ? (
          <TextAreaHalf
            key={language}
            id={fieldId}
            label={`${label} ${name}`}
            dir={dir}
            lang={language}
            value={value[language]}
            hint={hint}
            error={error}
            onChange={change}
          />
        ) : (
          <TextField
            key={language}
            id={fieldId}
            label={`${label} ${name}`}
            dir={dir}
            lang={language}
            value={value[language]}
            hint={hint}
            error={error}
            onChange={(event) => change(event.target.value)}
          />
        );
      })}
    </div>
  );
};

/** The multi-line half, with the same label, hint and error wiring as
 *  `TextField`: `forms.css` draws the notch, `.field-textarea` puts the label
 *  on the first line. */
const TextAreaHalf = ({
  id,
  label,
  dir,
  lang,
  value,
  hint,
  error,
  onChange,
}: {
  id: string;
  label: string;
  dir: "rtl" | "ltr";
  lang: string;
  value: string;
  hint: string;
  error: string | null;
  onChange: (value: string) => void;
}) => {
  const generated = useId();
  const hintId = `${generated}-hint`;
  const errorId = error ? `${generated}-error` : undefined;
  return (
    <div className={`field field-textarea flex flex-col gap-2${error ? " field-invalid" : ""}`}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        name={id}
        dir={dir}
        lang={lang}
        rows={3}
        value={value}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ")}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_TEXTAREA}
      />
      <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
        {hint}
      </p>
      {error ? (
        <p id={errorId} className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
    </div>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const LocalizedTextPair = memo(LocalizedTextPairView);
