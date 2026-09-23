"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { CharCounter } from "@/components/ui/char-counter";
import { MediaPicker } from "@/components/admin/pages/media-picker";
import { SEO_GUIDANCE, seoLength } from "@/lib/admin/editorial-draft";
import type { LocalizedText } from "@/lib/api/types";
import type { ImageSectionProps } from "./section-props";

/**
 * How the page reads in a search result and in a shared link.
 *
 * The counters are guidance, not limits. The API enforces no maximum on
 * either field, so a control that refused a longer title would be inventing
 * a rule the platform does not have — it says how much will be *shown* and
 * leaves the decision with the author, which is the only honest thing a
 * counter over an unlimited field can do.
 */
export function SeoSection({
  draft,
  onChange,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: ImageSectionProps) {
  const t = useTranslations("PresidentMessage");
  const { metaTitle, metaDescription } = draft.seo;

  /** One language's counter, for the column that language's input sits in.
   *  Both are counted, not just the one the dashboard is being read in: the
   *  page is published in both, and an English description twice the length
   *  of the Arabic one is a defect nobody sees while editing in Arabic. */
  const counter = (value: LocalizedText, limit: number, lang: "ar" | "en") => {
    const count = seoLength(value, lang);
    return (
      <CharCounter
        lang={lang}
        over={count > limit}
        text={t(count > limit ? "seoCounterOver" : "seoCounter", { count, limit })}
      />
    );
  };

  return (
    <>
      <BilingualField
        id="seo-title"
        labelAr={t("labelAr", { label: t("metaTitle") })}
        labelEn={t("labelEn", { label: t("metaTitle") })}
        valueAr={metaTitle.ar}
        valueEn={metaTitle.en}
        onChangeAr={(ar) => onChange({ seo: { ...draft.seo, metaTitle: { ...metaTitle, ar } } })}
        onChangeEn={(en) => onChange({ seo: { ...draft.seo, metaTitle: { ...metaTitle, en } } })}
        disabled={disabled}
        footerAr={counter(metaTitle, SEO_GUIDANCE.metaTitle, "ar")}
        footerEn={counter(metaTitle, SEO_GUIDANCE.metaTitle, "en")}
      />

      <BilingualField
        id="seo-description"
        multiline
        labelAr={t("labelAr", { label: t("metaDescription") })}
        labelEn={t("labelEn", { label: t("metaDescription") })}
        valueAr={metaDescription.ar}
        valueEn={metaDescription.en}
        onChangeAr={(ar) => onChange({ seo: { ...draft.seo, metaDescription: { ...metaDescription, ar } } })}
        onChangeEn={(en) => onChange({ seo: { ...draft.seo, metaDescription: { ...metaDescription, en } } })}
        disabled={disabled}
        footerAr={counter(metaDescription, SEO_GUIDANCE.metaDescription, "ar")}
        footerEn={counter(metaDescription, SEO_GUIDANCE.metaDescription, "en")}
      />

      <p className="text-caption text-[color:var(--color-text-muted)]">{t("seoNote")}</p>

      <MediaPicker
        label={t("shareImage")}
        value={draft.seo.ogImageId}
        images={images}
        canRead={canReadMedia}
        disabled={disabled}
        locale={locale}
        onChange={(ogImageId) => onChange({ seo: { ...draft.seo, ogImageId } })}
        onUploaded={onUploaded}
      />

      <Preview title={metaTitle} description={metaDescription} locale={locale} />
    </>
  );
}
/** The result as a search engine draws it — the point being that an author
 *  reads their own title the way a visitor will, rather than as a field. */
function Preview({
  title,
  description,
  locale,
}: {
  title: LocalizedText;
  description: LocalizedText;
  locale: "ar" | "en";
}) {
  const t = useTranslations("PresidentMessage");
  const shown = { title: title[locale].trim(), description: description[locale].trim() };

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 py-3">
      <h4 className="text-caption font-medium text-[color:var(--color-text-secondary)]">
        {t("seoPreview")}
      </h4>

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
}

/** An ellipsis, not a hard cut: the preview shows that text continues, which
 *  is what a search result does too. */
function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}
