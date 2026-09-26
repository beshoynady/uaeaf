"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { PageActivationBar } from "@/components/admin/activation/page-activation-bar";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/president-message";
import type { PresidentMessageDraft, PresidentMessageResponse } from "@/lib/admin/president-message";
import type { AppLocale } from "@/i18n/routing";
import { FormSection } from "@/components/ui/form-section";

/** The registry key this record is addressed by, upstream and in the BFF. */
const ENTITY_TYPE = "presidentMessagePage";
import { HeroSection } from "./hero-section";
import { QuoteSection } from "./quote-section";
import { BodySection } from "./body-section";
import { ClosingSection } from "./closing-section";
import { ValuesSection } from "./values-section";
import { SeoSection } from "./seo-section";

/**
 * The whole message, on one screen, in the order it is printed.
 *
 * One draft held here rather than one per section: two sections read the same
 * `signatoryName`, and a section keeping its own copy would show one of them
 * a stale value. Sections receive their slice and a `onChange` that merges —
 * they hold nothing.
 *
 * Saving sends only the fields that changed (`toPatchBody`). That is not an
 * optimisation: two people may have this screen open on different sections,
 * and a save posting every field would have the second overwrite the first's
 * work with the values their own form was loaded with.
 *
 * ── On the shared shell since ADR-0102 §D1 ────────────────────────────────
 *
 * This screen used to carry its own copy of the shell: its own save, its own
 * leave guard, its own status and version panels, its own two-column grid. Four
 * other screens had the same code, so a fix to one of them was a fix to one of
 * them. `EditorShell` now owns all of it, and this file holds the draft and
 * which section goes where — which is what it was for.
 */
export const PresidentMessageEditor = ({
  record,
  images,
  canEdit,
  canPublish,
  canReadMedia,
  locale,
  editorial,
  fieldLabels,
}: {
  record: PresidentMessageResponse;
  images: readonly MediaAssetOption[];
  /** False for a reviewer who may decide on the message but not rewrite it. */
  canEdit: boolean;
  /** `presidentMessagePage:Publish` — the activation bar's control, not the
   *  form's. */
  canPublish: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  /** The record's editorial state as the server rendered it; null when the
   *  API refused that read, which costs the panels and not the form. */
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("PresidentMessage");
  const p = useTranslations("AboutFederation");

  // The record as a draft, built once: it is the baseline every keystroke is
  // compared against, and rebuilding it each time would make that comparison
  // deep instead of a reference check.
  const original = useMemo(() => toDraft(record), [record]);
  const [draft, setDraft] = useState<PresidentMessageDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);

  const dirty = changedFrom(original, draft).length > 0;
  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  const PATH = "/about/president";

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      heading={{ trail: [{ label: p("trailPages"), href: "/pages" }, { label: t("title") }], title: t("title") }}
      previewHref={PATH}
      activation={
        <PageActivationBar
          entity={ENTITY_TYPE}
          pageName={t("title")}
          recordId={record._id}
          isActive={record.isActive === true}
          canPublish={canPublish}
        />
      }
      dirty={dirty}
      // The record, not the baseline draft: `toPatchBody` compares the stored
      // row against the draft, which is how it sends only what changed.
      body={() => toPatchBody(record, draft)}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      fieldLabels={fieldLabels}
      seo={({ disabled, clearFailure }) => {
        const shared = {
          draft,
          onChange: (patch: Partial<PresidentMessageDraft>) => {
            clearFailure();
            setDraft((current) => ({ ...current, ...patch }));
          },
          disabled,
        };
        return <SeoSection {...shared} images={library} canReadMedia={canReadMedia} locale={locale} onUploaded={onUploaded} />;
      }}
    >
      {({ disabled, clearFailure }) => {
        const shared = {
          draft,
          onChange: (patch: Partial<PresidentMessageDraft>) => {
            clearFailure();
            setDraft((current) => ({ ...current, ...patch }));
          },
          disabled,
        };
        const imageProps = { images: library, canReadMedia, locale, onUploaded };

        return (
          <>
            <FormSection number={1} title={t("sectionHero")}>
              <HeroSection {...shared} {...imageProps} />
            </FormSection>

            <FormSection number={2} title={t("sectionQuote")}>
              <QuoteSection {...shared} />
            </FormSection>

            <FormSection number={3} title={t("sectionBody")}>
              <BodySection {...shared} />
            </FormSection>

            <FormSection number={4} title={t("sectionClosing")}>
              <ClosingSection {...shared} />
            </FormSection>

            <FormSection number={5} title={t("sectionValues")}>
              <ValuesSection {...shared} />
            </FormSection>
          </>
        );
      }}
    </EditorShell>
  );
};
