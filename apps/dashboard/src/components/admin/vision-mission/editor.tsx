"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { BlockListField } from "@/components/admin/editorial-editor/block-list-field";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { PageActivationBar } from "@/components/admin/activation/page-activation-bar";
import { SeoPanel } from "@/components/admin/editorial-editor/seo-panel";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { FormSection } from "@/components/ui/form-section";
import type { EditorialState } from "@/lib/admin/editorial-state";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/vision-mission";
import type { VisionMissionDraft, VisionMissionResponse } from "@/lib/admin/vision-mission";
import type { LocalizedText } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/** The registry key this record is addressed by, upstream and in the BFF. */
const ENTITY_TYPE = "visionMissionPage";

type TextField = "heroTitle" | "heroSubtitle" | "visionTitle" | "visionText" | "missionTitle" | "missionText" | "goalsTitle";

type ImageField = "heroImageId" | "visionImageId" | "missionImageId" | "valuesImageId" | "ctaImageId";

/**
 * The Vision & Mission page, on one screen, in the order it is printed
 * (ADR-0070): hero, vision, mission, goals, values, the call to the strategic
 * plan, search and sharing. Every picture the page prints has its picker in
 * the section it belongs to (owner rule 2026-09-14).
 *
 * Composed from the shared editor parts — the shell, the list field, the SEO
 * fields, the numbered section — so this file holds only the draft and which
 * field goes where. The statements are short plain text, so no rich-text
 * editor is loaded.
 */
export const VisionMissionEditor = ({
  record,
  images,
  canEdit,
  canPublish,
  canReadMedia,
  locale,
  editorial,
  fieldLabels,
}: {
  record: VisionMissionResponse;
  images: readonly MediaAssetOption[];
  canEdit: boolean;
  /** `visionMissionPage:Publish` — the activation bar's control, not the
   *  form's. */
  canPublish: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("VisionMission");
  const e = useTranslations("EditorialEditor");
  const p = useTranslations("AboutFederation");

  // Built once per record: the baseline every keystroke is compared against.
  const original = useMemo(() => toDraft(record), [record]);
  const [draft, setDraft] = useState<VisionMissionDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);

  const dirty = changedFrom(original, draft).length > 0;
  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      heading={{ trail: [{ label: p("trailPages"), href: "/pages" }, { label: t("title") }], title: t("title") }}
      previewHref="/about/governance/vision-mission"
      activation={
        <PageActivationBar
          entity={ENTITY_TYPE}
          pageName={t("title")}
          recordId={record._id}
          isActive={record.isActive === true}
          canPublish={canPublish}
        />
      }
      seo={({ disabled, clearFailure }) => (
        <SeoPanel
          seo={draft.seo}
          onChange={(seo) => {
            clearFailure();
            setDraft((current) => ({ ...current, seo }));
          }}
          disabled={disabled}
          images={library}
          canReadMedia={canReadMedia}
          onUploaded={onUploaded}
        />
      )}
      dirty={dirty}
      body={() => toPatchBody(original, draft)}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      fieldLabels={fieldLabels}
    >
      {({ disabled, clearFailure }) => {
        const change = (patch: Partial<VisionMissionDraft>) => {
          clearFailure();
          setDraft((current) => ({ ...current, ...patch }));
        };

        const text = (field: TextField, label: string, options: { multiline?: boolean; required?: boolean } = {}) => {
          const value: LocalizedText = draft[field];
          return (
            <BilingualField
              id={`vision-mission-${field}`}
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
            </FormSection>

            <FormSection number={2} title={t("sectionVision")}>
              {text("visionTitle", t("visionTitle"))}
              {text("visionText", t("visionText"), { multiline: true, required: true })}
              {picture("visionImageId", t("visionImage"))}
            </FormSection>

            <FormSection number={3} title={t("sectionMission")}>
              {text("missionTitle", t("missionTitle"))}
              {text("missionText", t("missionText"), { multiline: true, required: true })}
              {picture("missionImageId", t("missionImage"))}
            </FormSection>

            <FormSection number={4} title={t("sectionGoals")}>
              {text("goalsTitle", t("goalsTitle"))}
              <BlockListField
                id="goal"
                items={draft.strategicGoals}
                onChange={(strategicGoals) => change({ strategicGoals })}
                disabled={disabled}
                withIcon
                labels={{
                  legend: (number, total) => t("goalLegend", { number, total }),
                  add: t("addGoal"),
                  remove: t("removeGoal"),
                  empty: t("noGoals"),
                }}
              />
            </FormSection>

            <FormSection number={5} title={t("sectionValues")}>
              {picture("valuesImageId", t("valuesImage"))}
              <BlockListField
                id="value"
                items={draft.coreValues}
                onChange={(coreValues) => change({ coreValues })}
                disabled={disabled}
                withIcon
                labels={{
                  legend: (number, total) => t("valueLegend", { number, total }),
                  add: t("addValue"),
                  remove: t("removeValue"),
                  empty: t("noValues"),
                }}
              />
            </FormSection>

            <FormSection number={6} title={t("sectionCta")}>
              {picture("ctaImageId", t("ctaImage"))}
              <p className="text-caption text-[color:var(--color-text-muted)]">{t("ctaNote")}</p>
            </FormSection>

          </>
        );
      }}
    </EditorShell>
  );
};
