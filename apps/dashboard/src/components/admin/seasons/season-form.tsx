"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { RequiredHint } from "@/components/ui/required-field";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { suggestSlug } from "@/lib/admin/articles";
import { draftFromSeason, draftProblems, toCreateBody, toPatchBody } from "@/lib/admin/seasons/season-draft";
import { useSeasonWrite } from "@/lib/admin/seasons/use-season-write";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import type { SeasonDraft } from "@/lib/admin/seasons/season-draft";
import type { DocumentOption, SeasonEditorPermissions, SeasonSponsor } from "@/lib/admin/seasons/editor-screen";
import type { AdminSeason, PublishMode } from "@/lib/admin/seasons/types";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { BackToSeasons } from "./season-links";
import { SeasonAboutSection } from "./season-about-section";
import { SeasonPublishingCard, SeasonStatusCard } from "./season-aside";
import { SeasonDocumentsSection } from "./season-documents-section";
import { SeasonIdentitySection } from "./season-identity-section";
import { SeasonKeyDatesSection } from "./season-key-dates-section";
import { SeasonPhasesSection } from "./season-phases-section";
import { SeasonSeoSection } from "./season-seo-section";
import { SeasonVisualsSection } from "./season-visuals-section";
import type { SeasonDraftSetter } from "./season-form-types";

/**
 * Adding a season, and changing one — one component for both, as the album
 * form is: the two ask the same seven questions in the same order (dash-02)
 * and differ in where the answers go and whether the address can still be
 * set.
 *
 * A full page with its own address, never an overlay, for the album form's
 * reasons: it can be linked to and returned to.
 *
 * -- Save is never disabled -------------------------------------------------
 *
 * A disabled button says something is wrong and refuses to say what. The press
 * is answered with the problems instead, beside the fields that cause them,
 * and the first of them in the bar — judged at the press, from the draft as it
 * is then (CLAUDE.md §31).
 *
 * -- Save and publish are two steps -----------------------------------------
 *
 * Save writes the season. Publishing — or sending for approval, when the
 * policy requires it — is the card beside the form, and it acts on the saved
 * version; see `SeasonPublishingCard`. Every refusal — an overlapping range, a
 * stale version, a missing banner, a review already running — is put on
 * screen by name.
 */
export const SeasonForm = ({
  record,
  images: initialImages,
  documents,
  sponsors,
  permissions,
  publishMode,
  locale,
  now,
}: {
  record: AdminSeason | null;
  images: readonly MediaAssetOption[];
  documents: readonly DocumentOption[];
  sponsors: readonly SeasonSponsor[] | null;
  permissions: SeasonEditorPermissions;
  publishMode: PublishMode;
  locale: "ar" | "en";
  /** The server's clock at render, so the phase shown is the same on both
   *  sides of hydration. */
  now: string;
}) => {
  const t = useTranslations("Seasons");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, setFailure, send, json } = useSeasonWrite();

  const creating = record === null;
  const [draft, setDraft] = useState<SeasonDraft>(() => draftFromSeason(record));
  const [images, setImages] = useState<MediaAssetOption[]>([...initialImages]);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!creating);
  const [leaving, setLeaving] = useState(false);

  useUnsavedGuard(dirty);

  const set: SeasonDraftSetter = (key, value) => {
    setDirty(true);
    setFailure(null);
    setDraft((current) => {
      const next = { ...current, [key]: value };
      // The address follows the English name until the editor writes one.
      if (key === "nameEn" && !slugEdited) next.slug = suggestSlug(String(value));
      return next;
    });
  };

  const problems = draftProblems(draft, creating);
  const disabled = !permissions.canUpdate;
  const name = draft.nameAr || draft.nameEn;

  const save = async () => {
    if (draftProblems(draft, creating).length > 0) {
      setShowErrors(true);
      return;
    }

    const outcome = creating
      ? await send("/api/admin/seasons", json(toCreateBody(draft)), { refresh: false })
      : await send(`/api/admin/seasons/${record.id}`, json(toPatchBody(draft), "PATCH"));
    if (!outcome.ok) return;

    setDirty(false);
    setShowErrors(false);
    toast.show({
      tone: "success",
      title: t(creating ? "createdToast" : "updatedToast"),
      description: name,
      source: "api",
      dedupeKey: `seasons:${creating ? "created" : "updated"}`,
    });

    if (creating) {
      const saved = outcome.body as { _id?: unknown; id?: unknown } | null;
      const id = saved?._id ?? saved?.id;
      router.push(typeof id === "string" ? `/seasons/${id}/edit` : "/seasons");
    }
  };

  const publish = async () => {
    if (!record) return;
    // Read at the press: work typed after the page loaded is not what the
    // publish would send, so it is refused rather than silently left out.
    if (dirty) {
      setFailure(t("publishNeedsSave"));
      return;
    }
    if (!record.updatedAt) {
      setFailure(t("publishNoVersion"));
      return;
    }
    const outcome = await send(
      `/api/admin/seasons/${record.id}/publish`,
      json({ expectedUpdatedAt: record.updatedAt }, "PATCH"),
    );
    if (outcome.ok) {
      toast.show({ tone: "success", title: t("publishedToast"), description: name, source: "api", dedupeKey: "seasons:published" });
    }
  };

  const submit = async () => {
    if (!record) return;
    // Read at the press, like the publish: submitting freezes the saved
    // record, so unsaved work would be left out of the review without a word.
    if (dirty) {
      setFailure(t("publishNeedsSave"));
      return;
    }
    const outcome = await send(`/api/admin/seasons/${record.id}/submit`, { method: "POST" });
    if (outcome.ok) {
      toast.show({ tone: "success", title: t("submittedToast"), description: name, source: "api", dedupeKey: "seasons:submitted" });
    }
  };

  const leave = () => {
    // Read now, so work typed after this handler was wired still counts.
    if (dirty) {
      setLeaving(true);
      return;
    }
    router.push("/seasons");
  };

  const sectionProps = { draft, set, problems, showErrors, disabled };
  const addImage = (image: MediaAssetOption) => setImages((current) => [image, ...current]);

  return (
    <div className="flex flex-col gap-5">
      <BackToSeasons />

      <StickyFormActions
        status={
          showErrors && problems.length > 0 ? t(`problem_${problems[0].code}`) : dirty ? t("unsaved") : t("formReady")
        }
        statusProps={{ "aria-live": "polite" }}
      >
        <Button variant="ghost" onClick={leave}>
          {t("cancel")}
        </Button>
        {permissions.canUpdate ? (
          <Button loading={busy} onClick={() => void save()}>
            {creating ? t("createSeason") : t("saveChanges")}
          </Button>
        ) : null}
      </StickyFormActions>

      {leaving ? (
        <InlineConfirm
          message={t("leaveConfirmBody")}
          confirmLabel={t("leaveConfirmLeave")}
          cancelLabel={t("leaveConfirmStay")}
          onConfirm={() => {
            setLeaving(false);
            setDirty(false);
            router.push("/seasons");
          }}
          onCancel={() => setLeaving(false)}
        />
      ) : null}

      <WriteFailure message={failure} />

      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-3 xl:items-start">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <RequiredHint />
          <SeasonIdentitySection {...sectionProps} creating={creating} onSlugEdited={() => setSlugEdited(true)} />
          <SeasonVisualsSection
            {...sectionProps}
            images={images}
            canReadMedia={permissions.canReadMedia}
            locale={locale}
            onUploaded={addImage}
          />
          <SeasonPhasesSection {...sectionProps} />
          <SeasonKeyDatesSection {...sectionProps} />
          <SeasonAboutSection {...sectionProps} />
          <SeasonDocumentsSection
            {...sectionProps}
            documents={documents}
            canReadDocuments={permissions.canReadDocuments}
            sponsors={sponsors}
            creating={creating}
            locale={locale}
          />
          <SeasonSeoSection
            {...sectionProps}
            images={images}
            canReadMedia={permissions.canReadMedia}
            locale={locale}
            onUploaded={addImage}
          />
        </div>

        <aside className="flex flex-col gap-5">
          {record ? <SeasonStatusCard record={record} locale={locale} now={new Date(now)} /> : null}
          <SeasonPublishingCard
            record={record}
            isVisible={draft.isVisible}
            onVisibleChange={(visible) => set("isVisible", visible)}
            publishMode={publishMode}
            canUpdate={permissions.canUpdate}
            canPublish={permissions.canPublish}
            busy={busy}
            onPublish={() => void publish()}
            onSubmit={() => void submit()}
          />
        </aside>
      </div>
    </div>
  );
};
