"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isLocalized, readableText } from "@/lib/admin/revisions";
import type { RevisionDetail } from "@/lib/admin/revisions";

/**
 * What one past version said.
 *
 * Text, never markup. The stored snapshot carries rich text as ProseMirror
 * JSON, and rendering it back as HTML would put a past version's markup into
 * a page that only ever admitted markup through the editor's allowlist — a
 * version frozen before a rule tightened would walk straight through it. So
 * the words come out and the formatting does not.
 *
 * There is no comparison with the current draft, word-level or otherwise
 * (owner decision): this answers "what did this version say", and the reader
 * decides whether that is what they want back.
 *
 * Generic across entity types. It is handed a bag of fields whose names it
 * does not know, so it prints what it can and names what it cannot: an
 * unlabelled field keeps its stored path rather than being hidden, because a
 * hidden field is a version that reads as emptier than it is.
 */
export function RevisionReader({
  revision,
  fieldLabels,
  onClose,
}: {
  revision: RevisionDetail;
  /** Field names in the reader's words, keyed by the stored field name. */
  fieldLabels?: Readonly<Record<string, string>>;
  onClose: () => void;
}) {
  const t = useTranslations("Revisions");
  const entries = Object.entries(revision.content);

  return (
    <section
      // A region, so it is reachable as a landmark: the reader is a distinct
      // piece of content that appears beside a list, and a screen-reader user
      // needs a way back to it after moving through the versions.
      role="region"
      aria-label={t("readerLabel", { number: revision.versionNumber })}
      className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-sunken)] px-3 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("version", { number: revision.versionNumber })}
        </h4>
        {/* Named for this version, not just "close": the row above carries a
            toggle that closes the same thing, and two controls with one
            accessible name is a reader hearing the same button twice. */}
        <Button variant="ghost" onClick={onClose}>
          {t("closeReaderOf", { number: revision.versionNumber })}
        </Button>
      </div>

      <dl className="flex flex-col gap-3">
        {entries.map(([field, value]) => {
          const label = fieldLabels?.[field] ?? field;
          const named = fieldLabels?.[field] !== undefined;

          return isLocalized(value) ? (
            <div key={field} className="flex flex-col gap-2">
              <Field label={t("labelAr", { label })} value={readableText(value.ar)} named={named} />
              <Field label={t("labelEn", { label })} value={readableText(value.en)} named={named} />
            </div>
          ) : (
            <Field key={field} label={label} value={readableText(value)} named={named} />
          );
        })}
      </dl>
    </section>
  );
}

/** One field of a frozen version: its name, and what it held. */
function Field({
  label,
  value,
  named,
}: {
  label: string;
  value: string | null;
  /** False when the label is the stored field name rather than a translated
   *  one, which is what decides its direction below. */
  named: boolean;
}) {
  const t = useTranslations("Revisions");

  return (
    <div className="flex flex-col gap-[2px]">
      <dt
        // A stored field name is an identifier; bidi reordering would turn
        // `featuredImageId` into something that no longer matches what a
        // reader would search the code for.
        dir={named ? undefined : "ltr"}
        className="text-caption text-[color:var(--color-text-muted)]"
      >
        {label}
      </dt>
      <dd
        // `dir="auto"` because the value may be Arabic, English or an id, and
        // which it is changes per version, not per field.
        dir="auto"
        className="whitespace-pre-line text-body-sm text-[color:var(--color-text-primary)]"
      >
        {/* A dash, not an omitted row: a reader has to be able to see that
            this version had nothing here, rather than infer it from absence. */}
        {value ?? t("emptyField")}
      </dd>
    </div>
  );
}
