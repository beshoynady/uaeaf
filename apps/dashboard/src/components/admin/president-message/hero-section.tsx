"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { MediaPicker } from "@/components/admin/pages/media-picker";
import type { ImageSectionProps } from "./section-props";

/**
 * The top of the page: two images and the three lines printed over them.
 *
 * The name lives here rather than with the signature, even though it is
 * printed in both places, because this is where an author meets it first.
 * It is one field either way — `signatoryName` — and the note says so, so
 * nobody goes looking for a second one to keep in step.
 */
export function HeroSection({
  draft,
  onChange,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: ImageSectionProps) {
  const t = useTranslations("PresidentMessage");

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <MediaPicker
          label={t("heroImage")}
          value={draft.heroImageId}
          images={images}
          canRead={canReadMedia}
          disabled={disabled}
          locale={locale}
          onChange={(heroImageId) => onChange({ heroImageId })}
          onUploaded={onUploaded}
        />

        <div className="flex flex-col gap-2">
          <MediaPicker
            label={t("portraitImage")}
            value={draft.featuredImageId}
            images={images}
            canRead={canReadMedia}
            disabled={disabled}
            locale={locale}
            onChange={(featuredImageId) => onChange({ featuredImageId })}
            onUploaded={onUploaded}
          />
          {/* Stated here rather than discovered at publish time, where the
              refusal names a field an author has no other reason to know by
              name. */}
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("portraitNote")}</p>
        </div>
      </div>

      <p className="text-caption text-[color:var(--color-text-muted)]">{t("altNote")}</p>

      <BilingualField
        id="hero-title"
        labelAr={t("labelAr", { label: t("heroTitle") })}
        labelEn={t("labelEn", { label: t("heroTitle") })}
        valueAr={draft.heroTitle.ar}
        valueEn={draft.heroTitle.en}
        onChangeAr={(ar) => onChange({ heroTitle: { ...draft.heroTitle, ar } })}
        onChangeEn={(en) => onChange({ heroTitle: { ...draft.heroTitle, en } })}
        disabled={disabled}
        required
      />

      <BilingualField
        id="hero-subtitle"
        labelAr={t("labelAr", { label: t("heroSubtitle") })}
        labelEn={t("labelEn", { label: t("heroSubtitle") })}
        valueAr={draft.heroSubtitle.ar}
        valueEn={draft.heroSubtitle.en}
        onChangeAr={(ar) => onChange({ heroSubtitle: { ...draft.heroSubtitle, ar } })}
        onChangeEn={(en) => onChange({ heroSubtitle: { ...draft.heroSubtitle, en } })}
        disabled={disabled}
        required
      />

      <BilingualField
        id="signatory-name"
        labelAr={t("labelAr", { label: t("signatoryName") })}
        labelEn={t("labelEn", { label: t("signatoryName") })}
        valueAr={draft.signatoryName.ar}
        valueEn={draft.signatoryName.en}
        onChangeAr={(ar) => onChange({ signatoryName: { ...draft.signatoryName, ar } })}
        onChangeEn={(en) => onChange({ signatoryName: { ...draft.signatoryName, en } })}
        hint={t("signatoryNameNote")}
        disabled={disabled}
        required
      />
    </>
  );
}
