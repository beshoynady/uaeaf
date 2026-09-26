"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/admin/videos/dubai-time";
import type { AlbumPhoto } from "@/lib/admin/albums/types";

/**
 * One photo's description, beside the grid — read only, for now.
 *
 * A panel in the page, not an overlay: it sits next to the grid so the photo
 * stays in view while its details are read.
 *
 * TODO(media-patch): `PATCH /media-assets/:id` does not exist yet, so the
 * alternative text, the caption and the credit cannot be changed after the
 * upload. When it lands, these rows become the bilingual fields they
 * describe, and the generated-fallback counter above the grid is how an editor
 * finds the photos that need it.
 */
export const PhotoDetailsPanel = ({
  photo,
  position,
  locale,
  onClose,
}: {
  photo: AlbumPhoto;
  position: number;
  locale: "ar" | "en";
  onClose: () => void;
}) => {
  const t = useTranslations("Albums");

  const row = (label: string, value: string | null, dir?: "rtl" | "ltr") => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-[color:var(--color-text-secondary)]">{label}</dt>
      <dd dir={dir} className="text-body-sm text-[color:var(--color-text-primary)]">
        {value || "—"}
      </dd>
    </div>
  );

  return (
    <aside
      aria-labelledby="album-photo-details-title"
      className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 id="album-photo-details-title" className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("photoDetailsTitle", { position })}
        </h4>
        <Button variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.altText[locale] || photo.altText.ar}
        className="aspect-[4/3] w-full rounded-[var(--radius-sm)] object-cover"
      />

      {/* TODO(media-patch): read-only until `PATCH /media-assets/:id` exists. */}
      <dl className="flex flex-col gap-3">
        {row(t("altArLabel"), photo.altText.ar, "rtl")}
        {row(t("altEnLabel"), photo.altText.en, "ltr")}
        {row(t("captionArLabel"), photo.caption.ar, "rtl")}
        {row(t("captionEnLabel"), photo.caption.en, "ltr")}
        {row(t("photographerLabel"), photo.photographer)}
        {row(t("captureDateLabel"), photo.captureDate ? formatShortDate(photo.captureDate, locale) : null)}
        {row(t("visibilityLabel"), photo.isVisible ? t("visible") : t("hidden"))}
      </dl>

      <p className="text-caption text-[color:var(--color-text-muted)]">{t("detailsReadOnly")}</p>
    </aside>
  );
};
