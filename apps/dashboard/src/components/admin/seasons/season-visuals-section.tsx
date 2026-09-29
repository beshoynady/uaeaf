"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { MediaPicker } from "@/components/admin/pages/media-picker";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 2. The season's pictures: its banner, its logo, and the picture a shared
 *    link shows.
 *
 * All three optional and all three through the media library's own picker,
 * with upload in place — the same picker every page header uses. When the
 * reader cannot read the library the picker says so and the stored ids are
 * sent back untouched.
 *
 * No minimum source size is passed. The picker warns below twice the largest
 * size the image is drawn at (ADR-0086 D4), and the season hero and archive
 * card that will draw these are not built yet — a number here would be a
 * guess at their layout.
 */
export const SeasonVisualsSection = ({
  images,
  canReadMedia,
  locale,
  onUploaded,
  ...props
}: SeasonSectionProps & {
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: "ar" | "en";
  onUploaded: (image: MediaAssetOption) => void;
}) => {
  const t = useTranslations("Seasons");
  const { draft, set, disabled } = props;

  const picker = (key: "bannerId" | "logoId" | "shareImageId", label: string) => (
    <MediaPicker
      label={label}
      value={draft[key]}
      images={images}
      canRead={canReadMedia}
      disabled={disabled}
      locale={locale}
      onChange={(id) => set(key, id)}
      onUploaded={onUploaded}
    />
  );

  return (
    <FormSection number={2} title={t("sectionVisuals")}>
      {picker("bannerId", t("bannerLabel"))}
      {picker("logoId", t("logoLabel"))}
      {picker("shareImageId", t("shareImageLabel"))}
    </FormSection>
  );
};
