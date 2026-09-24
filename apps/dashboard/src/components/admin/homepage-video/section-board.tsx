"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { HomepagePreviewLink } from "@/components/admin/homepage/section-copy";
import { VideoSectionEditor } from "./section-editor";
import { toConfiguration } from "./section-draft";
import type { SectionDraft } from "./section-draft";
import type { VideoOption } from "./section-editor";
import type { AssociationOption } from "@/lib/admin/videos/association-options";
import type { AdminVideo } from "@/lib/admin/videos/types";

/**
 * The video section's settings, wired to the API.
 *
 * Separate from the editor for the same reason `MessageBoard` is separate from
 * `MessageInbox`: the editor owns what a setting means, and this owns only how
 * one travels — and now also the header, because the approved design puts Save
 * beside the title rather than under the form.
 *
 * It writes through the existing `page-sections` route. The section's settings
 * live on its own row, and a second way to configure one section would be a
 * second thing to keep in step.
 */
export const VideoSectionBoard = ({
  sectionId,
  initial,
  associationOptions,
  videoOptions,
  videos,
  locale,
}: {
  sectionId: string;
  initial: SectionDraft;
  associationOptions: readonly AssociationOption[];
  videoOptions: readonly VideoOption[];
  videos: readonly AdminVideo[];
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");
  const homepage = useTranslations("Homepage");
  const writeErrors = useTranslations("WriteErrors");
  const router = useRouter();
  const toast = useToast();

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (draft: SectionDraft) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/page-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: draft.enabled,
          sectionTitle: draft.heading,
          sectionSubtitle: draft.description,
          configuration: toConfiguration(draft),
        }),
      });

      if (response.ok) {
        // Redrawing from the server is what confirms the save: the form then
        // holds what was stored rather than what was typed, and the rail
        // beside it picks up a change to the section's visibility.
        router.refresh();
        toast.show({ tone: "success", title: t("saved"), source: "api", dedupeKey: "homepage:video:saved" });
        return;
      }

      // A refused save that says nothing is the worst outcome available here:
      // the form still shows every value the editor typed, which reads as
      // success, and they close the tab believing the homepage changed.
      const body = (await response.json().catch(() => null)) as { code?: string } | null;
      toast.show({
        tone: "error",
        title: homepage("saveFailed"),
        description: writeErrors(body?.code ?? "serviceUnavailable"),
        source: "api",
      });
      setDirty(true);
    } catch {
      toast.show({
        tone: "error",
        title: homepage("saveFailed"),
        description: writeErrors("serviceUnavailable"),
        source: "api",
      });
      setDirty(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        // Content / Homepage / this section. The middle crumb links to the
        // hero, which is what "Homepage" opens now that there is no index.
        breadcrumb={[
          { label: homepage("breadcrumbContent") },
          { label: homepage("breadcrumbSection"), href: `/${locale}/homepage/hero` },
          { label: t("sectionTitle") },
        ]}
        title={t("sectionTitle")}
        description={t("sectionSubtitle")}
        actions={
          <>
            <HomepagePreviewLink label={homepage("preview")} />
            {/* Outside the form, submitting it by id: the design puts Save in
                the header, and the draft lives in the editor below. */}
            <Button type="submit" form="video-section-form" disabled={!dirty} loading={saving}>
              {t("save")}
            </Button>
          </>
        }
      />

      <VideoSectionEditor
        initial={initial}
        onSave={save}
        onDirtyChange={setDirty}
        associationOptions={associationOptions}
        videoOptions={videoOptions}
        videos={videos}
        locale={locale}
      />
    </>
  );
};
