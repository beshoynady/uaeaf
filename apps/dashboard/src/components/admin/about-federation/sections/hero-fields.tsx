"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { MediaField } from "../media-field";
import type { SectionFieldsProps } from "./section-fields";

/**
 * The page's header: the line above the title, the title, the standfirst, and
 * the photograph behind them.
 *
 * It has no visibility switch anywhere on this screen, and that is deliberate
 * (ADR-0101 D2) — a page with no header is not a page.
 */
export const HeroFields = ({
  value,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: SectionFieldsProps<"hero">) => {
  const t = useTranslations("AboutFederation");

  return (
    <>
      <BilingualField
        id="about-hero-eyebrow"
        labelAr={t("hero.eyebrow")}
        labelEn={t("hero.eyebrow")}
        valueAr={value.eyebrow.ar}
        valueEn={value.eyebrow.en}
        onChangeAr={(ar) => patch({ eyebrow: { ...value.eyebrow, ar } })}
        onChangeEn={(en) => patch({ eyebrow: { ...value.eyebrow, en } })}
        disabled={disabled}
        required
        hint={t("hero.eyebrowHint")}
      />

      <BilingualField
        id="about-hero-title"
        labelAr={t("hero.title")}
        labelEn={t("hero.title")}
        valueAr={value.title.ar}
        valueEn={value.title.en}
        onChangeAr={(ar) => patch({ title: { ...value.title, ar } })}
        onChangeEn={(en) => patch({ title: { ...value.title, en } })}
        disabled={disabled}
        required
      />

      <BilingualField
        id="about-hero-description"
        labelAr={t("hero.description")}
        labelEn={t("hero.description")}
        valueAr={value.description.ar}
        valueEn={value.description.en}
        onChangeAr={(ar) => patch({ description: { ...value.description, ar } })}
        onChangeEn={(en) => patch({ description: { ...value.description, en } })}
        disabled={disabled}
        required
        multiline
      />

      <MediaField
        id="about-hero-image"
        label={t("hero.image")}
        value={value.imageId}
        images={images}
        canReadMedia={canReadMedia}
        disabled={disabled}
        locale={locale}
        onChange={(imageId) => patch({ imageId })}
        onUploaded={onUploaded}
        // The hero photograph is drawn full-bleed at 1440 and wider, so the
        // floor is twice the largest drawn width (ADR-0086 D4).
        minSourcePx={1600}
      />
    </>
  );
};
