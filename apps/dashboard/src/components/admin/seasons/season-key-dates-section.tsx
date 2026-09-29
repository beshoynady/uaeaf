"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/auth/text-field";
import { emptyKeyDate } from "@/lib/admin/seasons/season-draft";
import type { KeyDateDraft } from "@/lib/admin/seasons/season-draft";
import { AddRowButton, RowFooter } from "./row-controls";
import { clearOf, rowProblem } from "./season-form-types";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 4. The dates that matter in the season and are not events — registration
 *    opening, a club deadline. The public page marks them on the season's
 *    timeline.
 *
 * Each row is a title in both languages and a day, and — the rule the list
 * screen states — the day sits inside the season's own dates. Checked at the
 * save press, like the phases.
 */
const KEY_DATE_PROBLEMS = ["keyDateIncomplete", "keyDateOutsideSeason"] as const;

export const SeasonKeyDatesSection = (props: SeasonSectionProps) => {
  const t = useTranslations("Seasons");
  const { draft, set, problems, disabled } = props;

  const update = (index: number, patch: Partial<KeyDateDraft>) =>
    set(
      "keyDates",
      draft.keyDates.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)),
    );

  return (
    <FormSection
      number={4}
      title={t("sectionKeyDates")}
      complete={clearOf(problems, KEY_DATE_PROBLEMS)}
      completeLabel={t("sectionComplete")}
    >
      <p className="text-caption text-[color:var(--color-text-muted)]">{t("keyDatesHint")}</p>

      {draft.keyDates.map((entry, index) => {
        const position = index + 1;
        const error = rowProblem(props, index, KEY_DATE_PROBLEMS, t);
        return (
          <fieldset
            key={entry.key}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-3"
          >
            <legend className="px-1 text-caption font-medium text-[color:var(--color-text-secondary)]">
              {t("keyDateLegend", { position })}
            </legend>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField
                id={`${entry.key}-date`}
                label={t("keyDateLabel")}
                type="date"
                value={entry.date}
                required
                disabled={disabled}
                onChange={(event) => update(index, { date: event.target.value })}
              />
              <TextField
                id={`${entry.key}-title-ar`}
                label={t("keyDateTitleArLabel")}
                dir="rtl"
                value={entry.titleAr}
                required
                disabled={disabled}
                onChange={(event) => update(index, { titleAr: event.target.value })}
              />
              <TextField
                id={`${entry.key}-title-en`}
                label={t("keyDateTitleEnLabel")}
                value={entry.titleEn}
                required
                disabled={disabled}
                onChange={(event) => update(index, { titleEn: event.target.value })}
              />
            </div>
            <RowFooter
              error={error}
              removeLabel={t("removeKeyDate", { position })}
              disabled={disabled}
              onRemove={() => set("keyDates", draft.keyDates.filter((_, at) => at !== index))}
            />
          </fieldset>
        );
      })}

      <AddRowButton
        label={t("addKeyDate")}
        disabled={disabled}
        onAdd={() => set("keyDates", [...draft.keyDates, emptyKeyDate()])}
      />
    </FormSection>
  );
};
