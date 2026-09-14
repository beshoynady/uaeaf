"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { SEO_GUIDANCE, seoLength, type SeoDraft } from "@/lib/admin/editorial-draft";
import type { LocalizedText } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * How a page reads in a search result and in a shared link (ADR-0070), for
 * any editor holding a `SeoDraft`. Built from the President's Message SEO
 * section.
 *
 * The counters are guidance, not limits: the API enforces no maximum, so they
 * say how much will be shown and leave the decision with the author.
 */
export const SeoFields = ({
  seo,
  onChange,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: {
  seo: SeoDraft;
  onChange: (seo: SeoDraft) => void;
  disabled: boolean;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
}) => {
  const t = useTranslations("EditorialEditor");
  const { metaTitle, metaDescription } = seo;

  return (
    <>
      <div className="flex flex-col gap-2">
        <BilingualField
          id="seo-title"
          labelAr={t("labelAr", { label: t("metaTitle") })}
          labelEn={t("labelEn", { label: t("metaTitle") })}
          valueAr={metaTitle.ar}
          valueEn={metaTitle.en}
          onChangeAr={(ar) => onChange({ ...seo, metaTitle: { ...metaTitle, ar } })}
          onChangeEn={(en) => onChange({ ...seo, metaTitle: { ...metaTitle, en } })}
          disabled={disabled}
        />
        <Counter value={metaTitle} limit={SEO_GUIDANCE.metaTitle} />
      </div>

      <div className="flex flex-col gap-2">
        <BilingualField
          id="seo-description"
          multiline
          labelAr={t("labelAr", { label: t("metaDescription") })}
          labelEn={t("labelEn", { label: t("metaDescription") })}
          valueAr={metaDescription.ar}
          valueEn={metaDescription.en}
          onChangeAr={(ar) => onChange({ ...seo, metaDescription: { ...metaDescription, ar } })}
          onChangeEn={(en) => onChange({ ...seo, metaDescription: { ...metaDescription, en } })}
          disabled={disabled}
        />
        <Counter value={metaDescription} limit={SEO_GUIDANCE.metaDescription} />
      </div>

      <p className="text-caption text-[color:var(--color-text-muted)]">{t("seoNote")}</p>

      <MediaPicker
        label={t("shareImage")}
        value={seo.ogImageId}
        images={images}
        canRead={canReadMedia}
        disabled={disabled}
        locale={locale}
        onChange={(ogImageId) => onChange({ ...seo, ogImageId })}
        onUploaded={onUploaded}
      />

      <Preview title={metaTitle} description={metaDescription} locale={locale} />
    </>
  );
};

/** How much of a field a search result will show, in both languages: the page
 *  is published in both. */
const Counter = ({ value, limit }: { value: LocalizedText; limit: number }) => {
  const t = useTranslations("EditorialEditor");

  return (
    <p className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-[color:var(--color-text-muted)]">
      {(["ar", "en"] as const).map((locale) => {
        const count = seoLength(value, locale);
        return (
          <span key={locale} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
            {t(count > limit ? "seoCounterOver" : "seoCounter", { count, limit })}
          </span>
        );
      })}
    </p>
  );
};

const truncate = (value: string, limit: number): string => (value.length > limit ? `${value.slice(0, limit)}…` : value);

/** The result as a search engine draws it, so an author reads their own title
 *  the way a visitor will. */
const Preview = ({ title, description, locale }: { title: LocalizedText; description: LocalizedText; locale: AppLocale }) => {
  const t = useTranslations("EditorialEditor");
  const shown = { title: title[locale].trim(), description: description[locale].trim() };

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 py-3">
      <h4 className="text-caption font-medium text-[color:var(--color-text-secondary)]">{t("seoPreview")}</h4>

      {shown.title === "" && shown.description === "" ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("seoPreviewEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-body font-medium text-[color:var(--color-brand-primary)]">
            {truncate(shown.title, SEO_GUIDANCE.metaTitle)}
          </p>
          <p className="text-caption text-[color:var(--color-text-muted)]">
            {truncate(shown.description, SEO_GUIDANCE.metaDescription)}
          </p>
        </div>
      )}
    </section>
  );
};
