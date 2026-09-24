"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { HERO_TEXT_LIMITS, dubaiLocalToIso, isoToDubaiLocal } from "@uaeaf/content/hero";
import { TextField } from "@/components/auth/text-field";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import type { FieldError, LtrImageMode, SlideDraft } from "@/lib/admin/homepage-hero";
import { CtaCard } from "./cta-card";
import { errorAt, fieldMessage } from "./field-errors";
import { HeroImageField } from "./hero-image-field";
import { LocalizedTextPair } from "./localized-text-pair";
import { SwitchField } from "@/components/ui/switch-field";

/**
 * The editor for one slide, in four sections: text, buttons, pictures,
 * visibility and schedule. Every change goes straight into the draft, so the
 * preview beside it follows each keystroke; nothing reaches the site until
 * Save.
 */

const MODES: { mode: LtrImageMode; label: string; hint: string }[] = [
  { mode: "same", label: "modeSame", hint: "modeSameHint" },
  { mode: "mirror", label: "modeMirror", hint: "modeMirrorHint" },
  { mode: "separate", label: "modeSeparate", hint: "modeSeparateHint" },
];

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 md:p-6">
    <h3 id={id} className="text-h4 text-[color:var(--color-text-primary)]">
      {title}
    </h3>
    {children}
  </section>
);

export const SlideEditor = ({
  slide,
  number,
  onChange,
  onDuplicate,
  onRemove,
  canDuplicate,
  errors,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: {
  slide: SlideDraft;
  number: number;
  /** Stable across renders: the parts below are memoised on it. */
  onChange: (key: string, patch: Partial<SlideDraft>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canDuplicate: boolean;
  errors: readonly FieldError[];
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
}) => {
  const t = useTranslations("HomepageHero");
  const at = (field: string) => `slides.${slide.key}.${field}`;
  const message = (field: string) => fieldMessage(t, errorAt(errors, at(field)));
  const base = `slide-${slide.key}`;
  const { key } = slide;
  // One setter per field, stable for the slide: the text pairs, button cards and
  // picture fields are memoised, and a fresh arrow each render would defeat that.
  const set = useMemo(() => {
    const field =
      <K extends keyof SlideDraft>(name: K) =>
      (value: SlideDraft[K]) =>
        onChange(key, { [name]: value } as Partial<SlideDraft>);
    return {
      eyebrow: field("eyebrow"),
      title: field("title"),
      subtitle: field("subtitle"),
      primaryCta: field("primaryCta"),
      secondaryCta: field("secondaryCta"),
      imageAssetId: field("imageAssetId"),
      desktopFocalPoint: field("desktopFocalPoint"),
      useMobileImage: field("useMobileImage"),
      mobileImageAssetId: field("mobileImageAssetId"),
      mobileFocalPoint: field("mobileFocalPoint"),
      ltrImageAssetId: field("ltrImageAssetId"),
      ltrFocalPoint: field("ltrFocalPoint"),
      active: field("active"),
    };
  }, [onChange, key]);

  return (
    <div className="flex flex-col gap-6">
      <Section id={`${base}-text`} title={t("sectionText")}>
        <LocalizedTextPair
          id={`${base}-eyebrow`}
          label={t("eyebrow")}
          value={slide.eyebrow}
          onChange={set.eyebrow}
          limit={HERO_TEXT_LIMITS.eyebrow}
          linesHint={t("oneLine")}
          errors={errors}
          errorPath={at("eyebrow")}
        />
        <LocalizedTextPair
          id={`${base}-title`}
          label={t("headline")}
          value={slide.title}
          onChange={set.title}
          limit={HERO_TEXT_LIMITS.title}
          linesHint={t("twoLines")}
          errors={errors}
          errorPath={at("title")}
        />
        <LocalizedTextPair
          id={`${base}-subtitle`}
          label={t("body")}
          value={slide.subtitle}
          onChange={set.subtitle}
          limit={HERO_TEXT_LIMITS.subtitle}
          linesHint={t("threeLines")}
          errors={errors}
          errorPath={at("subtitle")}
          multiline
        />
      </Section>

      <Section id={`${base}-buttons`} title={t("sectionButtons")}>
        <div className="flex flex-col gap-4">
          <CtaCard
            id={`${base}-primary`}
            slot="primary"
            value={slide.primaryCta}
            otherVisible={slide.secondaryCta.isVisible}
            onChange={set.primaryCta}
            errors={errors}
            errorPath={at("primaryCta")}
          />
          <CtaCard
            id={`${base}-secondary`}
            slot="secondary"
            value={slide.secondaryCta}
            otherVisible={slide.primaryCta.isVisible}
            onChange={set.secondaryCta}
            errors={errors}
            errorPath={at("secondaryCta")}
          />
        </div>
      </Section>

      <Section id={`${base}-images`} title={t("sectionImages")}>
        <p className="text-caption text-[color:var(--color-text-secondary)]">{t("compositionGuide")}</p>
        <HeroImageField
          id={`${base}-desktop`}
          label={t("desktopImage")}
          assetId={slide.imageAssetId}
          focalPoint={slide.desktopFocalPoint}
          onAsset={set.imageAssetId}
          onFocalPoint={set.desktopFocalPoint}
          images={images}
          canRead={canReadMedia}
          locale={locale}
          onUploaded={onUploaded}
          device="desktop"
          textZone="right"
          error={message("imageAssetId")}
        />

        <SwitchField
          id={`${base}-use-mobile`}
          label={t("useMobile")}
          checked={slide.useMobileImage}
          onChange={set.useMobileImage}
        />
        {slide.useMobileImage ? (
          <div className="flex flex-col gap-2 border-s-2 border-[color:var(--color-border-default)] ps-4">
            <p className="text-caption text-[color:var(--color-text-secondary)]">{t("mobileGuide")}</p>
            <HeroImageField
              id={`${base}-mobile`}
              label={t("mobileImage")}
              assetId={slide.mobileImageAssetId}
              focalPoint={slide.mobileFocalPoint}
              onAsset={set.mobileImageAssetId}
              onFocalPoint={set.mobileFocalPoint}
              images={images}
              canRead={canReadMedia}
              locale={locale}
              onUploaded={onUploaded}
              device="mobile"
              textZone="bottom"
              error={message("mobileImageAssetId")}
            />
          </div>
        ) : null}

        {/* One named radiogroup, not a fieldset around it: both would announce the
            same name twice. The warning and the separate picture sit outside it. */}
        <div className="flex flex-col gap-3">
          <p id={`${base}-english-label`} className="text-label font-medium text-[color:var(--color-text-secondary)]">
            {t("english")}
          </p>
          <div role="radiogroup" aria-labelledby={`${base}-english-label`} className="grid gap-3 md:grid-cols-3">
            {MODES.map(({ mode, label, hint }) => (
              <label
                key={mode}
                className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-3 transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-sunken)] has-[:checked]:border-[color:var(--color-brand-primary)] has-[:checked]:bg-[color:var(--color-surface-sunken)]"
              >
                <span className="flex items-center gap-2 text-label font-medium text-[color:var(--color-text-primary)]">
                  <input
                    type="radio"
                    name={`${base}-ltr-mode`}
                    value={mode}
                    checked={slide.ltrImageMode === mode}
                    onChange={() =>
                      onChange(
                        key,
                        mode === "separate" && !slide.ltrFocalPoint
                          ? { ltrImageMode: mode, ltrFocalPoint: { x: 50, y: 50 } }
                          : { ltrImageMode: mode },
                      )
                    }
                    className="size-4 accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                  />
                  {t(label)}
                </span>
                <span className="text-caption text-[color:var(--color-text-muted)]">{t(hint)}</span>
              </label>
            ))}
          </div>
          {slide.ltrImageMode === "mirror" ? (
            <p role="note" className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-3 py-2 text-caption font-medium text-[color:var(--color-text-primary)]">
              {t("mirrorWarning")}
            </p>
          ) : null}
          {slide.ltrImageMode === "separate" ? (
            <HeroImageField
              id={`${base}-ltr`}
              label={t("englishImage")}
              assetId={slide.ltrImageAssetId}
              focalPoint={slide.ltrFocalPoint}
              onAsset={set.ltrImageAssetId}
              onFocalPoint={set.ltrFocalPoint}
              images={images}
              canRead={canReadMedia}
              locale={locale}
              onUploaded={onUploaded}
              device="desktop"
              textZone="left"
              error={message("ltrImageAssetId")}
            />
          ) : null}
        </div>
      </Section>

      <Section id={`${base}-visibility`} title={t("sectionVisibility")}>
        <SwitchField
          id={`${base}-active`}
          label={t("slideVisible")}
          checked={slide.active}
          onChange={set.active}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={`${base}-from`}
            type="datetime-local"
            label={t("showsFrom")}
            value={slide.scheduledFrom ? isoToDubaiLocal(slide.scheduledFrom) : ""}
            onChange={(event) => onChange(key, { scheduledFrom: dubaiLocalToIso(event.target.value) })}
          />
          <TextField
            id={`${base}-until`}
            type="datetime-local"
            label={t("hidesAfter")}
            value={slide.scheduledTo ? isoToDubaiLocal(slide.scheduledTo) : ""}
            error={message("scheduledTo")}
            onChange={(event) => onChange(key, { scheduledTo: dubaiLocalToIso(event.target.value) })}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onDuplicate} disabled={!canDuplicate}>
            {t("duplicate")}
          </Button>
          <Button variant="destructive" onClick={onRemove}>
            {t("remove")}
          </Button>
        </div>
        <p className="sr-only">{t("slideNumber", { number })}</p>
      </Section>
    </div>
  );
};
