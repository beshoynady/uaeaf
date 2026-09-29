"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/ui/select-field";
import { FOCUS_RING } from "@/components/ui/interactive";
import type { DocumentOption, SeasonSponsor } from "@/lib/admin/seasons/editor-screen";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 6. The season's documents and its sponsors.
 *
 * -- Documents --------------------------------------------------------------
 *
 * The calendar is one document, the rest a set. Both are chosen from the
 * documents already in the library: the dashboard has no document upload,
 * and a picker that offered one would be a control with nowhere to send the
 * file. When the reader cannot read the library the section says so, and the
 * stored ids are sent back untouched.
 *
 * -- Sponsors ---------------------------------------------------------------
 *
 * A sponsor is not a field of the season (spec §6.2): it is a `sponsorships`
 * row whose target is this season. This section shows the ones that exist.
 * Creating one is the sponsors screen's job, and that screen does not yet
 * offer a season as a target — recorded as an open item rather than solved
 * here with a second, partial sponsorship editor.
 */
export const SeasonDocumentsSection = ({
  documents,
  canReadDocuments,
  sponsors,
  creating,
  locale,
  ...props
}: SeasonSectionProps & {
  documents: readonly DocumentOption[];
  canReadDocuments: boolean;
  sponsors: readonly { id: string; name: string }[] | null;
  creating: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Seasons");
  const { draft, set, disabled } = props;

  const toggle = (id: string, checked: boolean) =>
    set("documentIds", checked ? [...draft.documentIds, id] : draft.documentIds.filter((entry) => entry !== id));

  return (
    <FormSection number={6} title={t("sectionDocuments")}>
      {!canReadDocuments ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("documentsHidden")}</p>
      ) : documents.length === 0 ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("documentsEmpty")}</p>
      ) : (
        <>
          <SelectField
            id="season-calendar"
            label={t("calendarLabel")}
            value={draft.calendarDocumentId}
            disabled={disabled}
            onChange={(event) => set("calendarDocumentId", event.target.value)}
            options={[
              { value: "", label: t("calendarNone") },
              ...documents.map((document) => ({ value: document.id, label: document.label[locale] })),
            ]}
            hint={t("calendarHint")}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label font-medium text-[color:var(--color-text-primary)]">
              {t("otherDocumentsLabel")}
            </legend>
            {documents.map((document) => (
              <label
                key={document.id}
                className="flex min-h-11 items-center gap-3 text-body-sm text-[color:var(--color-text-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-[var(--opacity-disabled)]"
              >
                <input
                  type="checkbox"
                  checked={draft.documentIds.includes(document.id)}
                  disabled={disabled}
                  onChange={(event) => toggle(document.id, event.target.checked)}
                  className={`size-[var(--icon-size-xs)] accent-[color:var(--color-brand-primary)] ${FOCUS_RING}`}
                />
                <span dir="auto">{document.label[locale]}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}

      <div className="flex flex-col gap-2">
        <h4 className="text-label font-medium text-[color:var(--color-text-primary)]">{t("sponsorsLabel")}</h4>
        {creating ? (
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("sponsorsAfterCreate")}</p>
        ) : sponsors === null ? (
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("sponsorsHidden")}</p>
        ) : sponsors.length === 0 ? (
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("sponsorsNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {sponsors.map((sponsor) => (
              <li
                key={sponsor.id}
                className="inline-flex min-h-6 items-center rounded-[var(--radius-full)] bg-[color:var(--color-surface-sunken)] px-2.5 text-caption font-medium text-[color:var(--color-text-primary)]"
              >
                {sponsor.name}
              </li>
            ))}
          </ul>
        )}
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("sponsorsHint")}</p>
      </div>
    </FormSection>
  );
};
