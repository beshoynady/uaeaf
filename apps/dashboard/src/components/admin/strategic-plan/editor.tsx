"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { SeoFields } from "@/components/admin/editorial-editor/seo-fields";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { FormSection } from "@/components/ui/form-section";
import { PlanListField, type PlanListLabels } from "@/components/admin/strategic-plan/plan-list-field";
import type { EditorialState } from "@/lib/admin/editorial-state";
import { MAX_PLAN_ROW_ITEMS } from "@/lib/admin/plan-lists";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/strategic-plan";
import type { StrategicPlanDraft, StrategicPlanResponse } from "@/lib/admin/strategic-plan";
import type { LocalizedText } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/** The registry key this record is addressed by, upstream and in the BFF. */
const ENTITY_TYPE = "strategicPlansPage";

type TextField =
  | "heroTitle"
  | "heroSubtitle"
  | "introHeading"
  | "introText"
  | "phasesTitle"
  | "pillarsTitle"
  | "pillarsText"
  | "objectivesTitle"
  | "metricsTitle"
  | "executionTitle"
  | "executionText"
  | "ctaTitle"
  | "ctaText";

type ImageField = "heroImageId" | "introImageId" | "objectivesImageId" | "metricsImageId" | "ctaImageId";

const sameValue = (left: unknown, right: unknown): boolean => left === right || JSON.stringify(left) === JSON.stringify(right);

/**
 * The Strategic Plan page, on one screen, in the order it is printed
 * (ADR-0075): hero, overview, phases, pillars, objectives, indicators, the
 * execution path, the closing call, search and sharing. Every picture the
 * page prints has its picker in the section it belongs to (owner rule
 * 2026-09-14).
 *
 * There is deliberately no control for section order or section visibility
 * — not disabled, absent. The page rules guard the composition; an editor
 * orders and hides the items inside a section, never the section.
 */
export const StrategicPlanEditor = ({
  record,
  images,
  canEdit,
  canReadMedia,
  locale,
  editorial,
  fieldLabels,
}: {
  record: StrategicPlanResponse;
  images: readonly MediaAssetOption[];
  canEdit: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("StrategicPlan");
  const e = useTranslations("EditorialEditor");

  // Built once per record: the baseline every keystroke is compared against.
  const original = useMemo(() => toDraft(record), [record]);
  const [draft, setDraft] = useState<StrategicPlanDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);

  /** The baseline the draft was last reconciled with, the record's version
   *  that baseline came from, and the draft as it stood when a save was sent. */
  const baseline = useRef(original);
  const baselineVersion = useRef(record.updatedAt);
  const sent = useRef<StrategicPlanDraft | null>(null);

  /**
   * After a save the page re-reads the record, and a list item added in this
   * draft comes back with the id the API gave it. Without this the draft keeps
   * the item without its id: the form stays "unsaved", and the next save sends
   * the item as new again, so the API gives it another id.
   *
   * A field takes the record's value only when the editor has not touched it
   * since: it still equals the previous baseline, or, when a write landed (a
   * new `updatedAt`), it still equals what the save sent. Anything typed after
   * the save was sent is kept (CLAUDE.md §31). A re-read with the same version
   * changes nothing the editor wrote, so a failed save followed by a refresh
   * for another reason loses no work.
   *
   * Known narrow case: a failed save whose draft is not re-typed, followed by
   * another session's save of the same field, adopts that session's value.
   */
  useEffect(() => {
    const previous = baseline.current;
    if (previous === original) {
      return;
    }
    const written = baselineVersion.current !== record.updatedAt;
    const atSave = written ? sent.current : null;
    baseline.current = original;
    baselineVersion.current = record.updatedAt;
    if (written) {
      sent.current = null;
    }
    setDraft((current) => {
      const next = { ...current };
      for (const key of Object.keys(original) as (keyof StrategicPlanDraft)[]) {
        const untouched = sameValue(current[key], previous[key]) || (atSave !== null && sameValue(current[key], atSave[key]));
        if (untouched) {
          (next as Record<string, unknown>)[key] = original[key];
        }
      }
      return next;
    });
  }, [original, record.updatedAt]);

  const dirty = changedFrom(original, draft).length > 0;
  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  /** The words one list uses, from the four message keys each list has. A
   *  list that stands in one row also says why nothing more can be added. */
  const listLabels = (legend: string, add: string, remove: string, empty: string, limit?: number): PlanListLabels => ({
    legend: (number, total) => t(legend, { number, total }),
    add: t(add),
    remove: t(remove),
    empty: t(empty),
    show: t("visible"),
    hide: t("hidden"),
    lastVisible: t("lastVisibleNote"),
    ...(limit === undefined ? {} : { limitReached: t("limitNote", { max: limit }) }),
  });

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      dirty={dirty}
      body={() => {
        sent.current = draft;
        return toPatchBody(original, draft);
      }}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      fieldLabels={fieldLabels}
    >
      {({ disabled, clearFailure }) => {
        const change = (patch: Partial<StrategicPlanDraft>) => {
          clearFailure();
          setDraft((current) => ({ ...current, ...patch }));
        };

        const text = (field: TextField, label: string, options: { multiline?: boolean; required?: boolean } = {}) => {
          const value: LocalizedText = draft[field];
          return (
            <BilingualField
              id={`strategic-plan-${field}`}
              labelAr={e("labelAr", { label })}
              labelEn={e("labelEn", { label })}
              valueAr={value.ar}
              valueEn={value.en}
              onChangeAr={(ar) => change({ [field]: { ...value, ar } })}
              onChangeEn={(en) => change({ [field]: { ...value, en } })}
              disabled={disabled}
              multiline={options.multiline}
              required={options.required}
            />
          );
        };

        const picture = (field: ImageField, label: string) => (
          <MediaPicker
            label={label}
            value={draft[field]}
            images={library}
            canRead={canReadMedia}
            disabled={disabled}
            locale={locale}
            onChange={(id) => change({ [field]: id })}
            onUploaded={onUploaded}
          />
        );

        return (
          <>
            <FormSection number={1} title={t("sectionHero")}>
              {picture("heroImageId", t("heroImage"))}
              <p className="text-caption text-[color:var(--color-text-muted)]">{t("altNote")}</p>
              {text("heroTitle", t("heroTitle"), { required: true })}
              {text("heroSubtitle", t("heroSubtitle"), { required: true })}
              <p className="text-caption text-[color:var(--color-text-muted)]">{t("eyebrowNote")}</p>
            </FormSection>

            <FormSection number={2} title={t("sectionIntro")}>
              {text("introHeading", t("introHeading"), { required: true })}
              {text("introText", t("introText"), { multiline: true, required: true })}
              {picture("introImageId", t("introImage"))}
            </FormSection>

            <FormSection number={3} title={t("sectionPhases")}>
              {text("phasesTitle", t("phasesTitle"))}
              <PlanListField
                id="phase"
                items={draft.phases}
                onChange={(phases) => change({ phases })}
                disabled={disabled}
                fields={{ kind: "phase" }}
                max={MAX_PLAN_ROW_ITEMS}
                labels={listLabels("phaseLegend", "addPhase", "removePhase", "noPhases", MAX_PLAN_ROW_ITEMS)}
              />
            </FormSection>

            <FormSection number={4} title={t("sectionPillars")}>
              {text("pillarsTitle", t("pillarsTitle"), { required: true })}
              {text("pillarsText", t("pillarsText"), { multiline: true })}
              <PlanListField
                id="pillar"
                items={draft.pillars}
                onChange={(pillars) => change({ pillars })}
                disabled={disabled}
                fields={{ kind: "item" }}
                labels={listLabels("pillarLegend", "addPillar", "removePillar", "noPillars")}
              />
            </FormSection>

            <FormSection number={5} title={t("sectionObjectives")}>
              {text("objectivesTitle", t("objectivesTitle"), { required: true })}
              {picture("objectivesImageId", t("objectivesImage"))}
              <PlanListField
                id="objective"
                items={draft.objectives}
                onChange={(objectives) => change({ objectives })}
                disabled={disabled}
                fields={{ kind: "item" }}
                labels={listLabels("objectiveLegend", "addObjective", "removeObjective", "noObjectives")}
              />
            </FormSection>

            <FormSection number={6} title={t("sectionMetrics")}>
              {text("metricsTitle", t("metricsTitle"), { required: true })}
              {picture("metricsImageId", t("metricsImage"))}
              <PlanListField
                id="metric"
                items={draft.metrics}
                onChange={(metrics) => change({ metrics })}
                disabled={disabled}
                fields={{ kind: "metric" }}
                labels={listLabels("metricLegend", "addMetric", "removeMetric", "noMetrics")}
              />
            </FormSection>

            <FormSection number={7} title={t("sectionExecution")}>
              {text("executionTitle", t("executionTitle"), { required: true })}
              {text("executionText", t("executionText"), { multiline: true })}
              <PlanListField
                id="step"
                items={draft.executionSteps}
                onChange={(executionSteps) => change({ executionSteps })}
                disabled={disabled}
                fields={{ kind: "step" }}
                max={MAX_PLAN_ROW_ITEMS}
                labels={listLabels("stepLegend", "addStep", "removeStep", "noSteps", MAX_PLAN_ROW_ITEMS)}
              />
            </FormSection>

            <FormSection number={8} title={t("sectionCta")}>
              {text("ctaTitle", t("ctaTitle"), { required: true })}
              {text("ctaText", t("ctaText"), { multiline: true })}
              {picture("ctaImageId", t("ctaImage"))}
              <p className="text-caption text-[color:var(--color-text-muted)]">{t("ctaNote")}</p>
            </FormSection>

            <FormSection number={9} title={t("sectionSeo")}>
              <SeoFields
                seo={draft.seo}
                onChange={(seo) => change({ seo })}
                disabled={disabled}
                images={library}
                canReadMedia={canReadMedia}
                locale={locale}
                onUploaded={onUploaded}
              />
            </FormSection>
          </>
        );
      }}
    </EditorShell>
  );
};
