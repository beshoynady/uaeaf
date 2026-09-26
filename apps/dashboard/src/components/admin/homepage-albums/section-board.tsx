"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { HomepagePreviewLink } from "@/components/admin/homepage/section-copy";
import { GallerySectionEditor } from "./section-editor";
import { toGalleryConfiguration } from "./section-draft";
import type { GallerySectionDraft } from "./section-draft";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * The photo-gallery section's settings, wired to the API — the video section's
 * board, unchanged in shape: the editor owns what a setting means, this owns
 * how it travels and the header its Save sits in.
 *
 * Written through the existing `page-sections` route, onto the section's own
 * row. `enabled` goes to both places it is stored — the row, which the rail's
 * switch and the homepage read, and `configuration.enabled`, which the seeded
 * shape carries — so the two cannot disagree after a save from here.
 */
export const GallerySectionBoard = ({
  sectionId,
  initial,
  albums,
  albumsReadable,
  locale,
}: {
  sectionId: string;
  initial: GallerySectionDraft;
  albums: readonly AdminAlbum[];
  albumsReadable: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Albums");
  const homepage = useTranslations("Homepage");
  const writeErrors = useTranslations("WriteErrors");
  const router = useRouter();
  const toast = useToast();

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const fail = (code: string) => {
    // A refused save that says nothing reads as success: the form still shows
    // every value typed.
    toast.show({ tone: "error", title: homepage("saveFailed"), description: writeErrors(code), source: "api" });
    setDirty(true);
  };

  const save = async (draft: GallerySectionDraft) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/page-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: draft.enabled,
          sectionTitle: draft.heading,
          sectionSubtitle: draft.description,
          configuration: toGalleryConfiguration(draft),
        }),
      });
      if (response.ok) {
        // Redrawn from the server so the form holds what was stored, and the
        // rail beside it picks up a change to the section's visibility.
        router.refresh();
        toast.show({ tone: "success", title: t("gallerySaved"), source: "api", dedupeKey: "homepage:albums:saved" });
        return;
      }
      const body = (await response.json().catch(() => null)) as { code?: string } | null;
      fail(body?.code ?? "serviceUnavailable");
    } catch {
      fail("serviceUnavailable");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: homepage("breadcrumbContent") },
          { label: homepage("breadcrumbSection"), href: `/${locale}/homepage/hero` },
          { label: t("gallerySectionTitle") },
        ]}
        title={t("gallerySectionTitle")}
        description={t("gallerySectionSubtitle")}
        actions={
          <>
            <HomepagePreviewLink label={homepage("preview")} />
            <Button type="submit" form="gallery-section-form" disabled={!dirty} loading={saving}>
              {t("save")}
            </Button>
          </>
        }
      />

      <GallerySectionEditor
        initial={initial}
        onSave={save}
        onDirtyChange={setDirty}
        albums={albums}
        albumsReadable={albumsReadable}
        locale={locale}
      />
    </>
  );
};
