"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { SeoFields } from "@/components/admin/editorial-editor/seo-fields";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { clearOf, fieldProblem } from "./season-form-types";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 7. How the season page reads in a search result.
 *
 * The same fields, counters and preview every `PageSeo` record uses
 * (`SeoFields`), rather than a fourth hand-rolled SEO form — the reason
 * `PageSeo` is a shared schema at all. Its share-image picker is off here:
 * the season keeps its share image in section 2 (`shareImageId`), which the
 * public page prefers over `seo.ogImageId` (spec §4.4).
 *
 * Each field's two halves are both-or-neither, like every other pair: half a
 * title is a 400 upstream.
 */
export const SeasonSeoSection = ({
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
  const { draft, set, problems, disabled } = props;
  const error = fieldProblem(props, ["seoTitlePair", "seoDescriptionPair"], t);

  return (
    <FormSection
      number={7}
      title={t("sectionSeo")}
      complete={clearOf(problems, ["seoTitlePair", "seoDescriptionPair"])}
      completeLabel={t("sectionComplete")}
    >
      <SeoFields
        seo={draft.seo}
        onChange={(seo) => set("seo", seo)}
        disabled={disabled}
        images={images}
        canReadMedia={canReadMedia}
        locale={locale}
        onUploaded={onUploaded}
        shareImage={false}
      />
      {error ? (
        <p role="alert" className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
    </FormSection>
  );
};
