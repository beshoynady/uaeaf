"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import { emptyPhase } from "@/lib/admin/seasons/season-draft";
import { SEASON_PHASE_TYPES } from "@/lib/admin/seasons/types";
import type { PhaseDraft } from "@/lib/admin/seasons/season-draft";
import { AddRowButton, RowFooter } from "./row-controls";
import { PhaseStrip } from "./phase-strip";
import { PhaseTypeChip } from "./phase-type-chip";
import { clearOf, fieldProblem, rowProblem } from "./season-form-types";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 3. When the season runs, and the phases it is divided into.
 *
 * -- What is checked, and where ---------------------------------------------
 *
 * Every day is inclusive: the season covers its last day, and a phase may end
 * on it. Checked here at the save press — the submit-time rule every other
 * dashboard form follows — and again by the API, which is the arbiter and
 * whose refusals (an overlap with another season, two same-type phases
 * sharing a day) are shown by name:
 *
 * - each phase complete, not ending before it starts, inside the season;
 * - two phases of the same type never share a day; phases of different
 *   types may, on purpose (registration runs during competition).
 *
 * The strip above the rows draws the valid phases across the season, one
 * lane per type, in each type's treatment.
 */
const PHASE_ROW_PROBLEMS = ["phaseIncomplete", "phaseInverted", "phaseOutsideSeason", "phaseSameTypeOverlap"] as const;

export const SeasonPhasesSection = (props: SeasonSectionProps) => {
  const t = useTranslations("Seasons");
  const { draft, set, problems, disabled } = props;

  const update = (index: number, patch: Partial<PhaseDraft>) =>
    set(
      "phases",
      draft.phases.map((phase, at) => (at === index ? { ...phase, ...patch } : phase)),
    );

  return (
    <FormSection
      number={3}
      title={t("sectionTiming")}
      complete={clearOf(problems, ["startRequired", "endRequired", "rangeInverted", ...PHASE_ROW_PROBLEMS])}
      completeLabel={t("sectionComplete")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="season-start"
          label={t("startLabel")}
          type="date"
          value={draft.start}
          required
          disabled={disabled}
          onChange={(event) => set("start", event.target.value)}
          hint={t("dubaiDayHint")}
          error={fieldProblem(props, ["startRequired", "rangeInverted"], t)}
        />
        <TextField
          id="season-end"
          label={t("endLabel")}
          type="date"
          value={draft.end}
          required
          disabled={disabled}
          onChange={(event) => set("end", event.target.value)}
          hint={t("endHint")}
          error={fieldProblem(props, "endRequired", t)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-label font-bold text-[color:var(--color-text-primary)]">{t("phasesHeading")}</h4>
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("phasesHint")}</p>
        <PhaseStrip start={draft.start} end={draft.end} phases={draft.phases} />
        {draft.phases.length === 0 ? (
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("phasesEmpty")}</p>
        ) : null}

        {draft.phases.map((phase, index) => {
          const position = index + 1;
          const error = rowProblem(props, index, PHASE_ROW_PROBLEMS, t);
          return (
            <fieldset
              key={phase.key}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-3"
            >
              <legend className="px-1 text-caption font-medium text-[color:var(--color-text-secondary)]">
                {t("phaseLegend", { position })}
              </legend>
              {phase.type ? (
                <div>
                  <PhaseTypeChip type={phase.type} />
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  id={`${phase.key}-name-ar`}
                  label={t("phaseNameArLabel")}
                  dir="rtl"
                  value={phase.nameAr}
                  required
                  disabled={disabled}
                  onChange={(event) => update(index, { nameAr: event.target.value })}
                />
                <TextField
                  id={`${phase.key}-name-en`}
                  label={t("phaseNameEnLabel")}
                  value={phase.nameEn}
                  required
                  disabled={disabled}
                  onChange={(event) => update(index, { nameEn: event.target.value })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SelectField
                  id={`${phase.key}-type`}
                  label={t("phaseTypeLabel")}
                  value={phase.type}
                  placeholder
                  required
                  disabled={disabled}
                  onChange={(event) => update(index, { type: event.target.value as PhaseDraft["type"] })}
                  options={SEASON_PHASE_TYPES.map((type) => ({ value: type, label: t(`phaseType_${type}`) }))}
                />
                <TextField
                  id={`${phase.key}-from`}
                  label={t("phaseFromLabel")}
                  type="date"
                  value={phase.from}
                  required
                  disabled={disabled}
                  onChange={(event) => update(index, { from: event.target.value })}
                />
                <TextField
                  id={`${phase.key}-to`}
                  label={t("phaseToLabel")}
                  type="date"
                  value={phase.to}
                  required
                  disabled={disabled}
                  onChange={(event) => update(index, { to: event.target.value })}
                />
              </div>
              <RowFooter
                error={error}
                removeLabel={t("removePhase", { position })}
                disabled={disabled}
                onRemove={() => set("phases", draft.phases.filter((_, at) => at !== index))}
              />
            </fieldset>
          );
        })}

        <AddRowButton
          label={t("addPhase")}
          disabled={disabled}
          onAdd={() => set("phases", [...draft.phases, emptyPhase()])}
        />
      </div>
    </FormSection>
  );
};
