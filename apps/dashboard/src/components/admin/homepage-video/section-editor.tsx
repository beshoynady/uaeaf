"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BilingualField } from "@/components/admin/bilingual-field";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui/choice-card";
import { SelectField } from "@/components/ui/select-field";
import { SettingsCard } from "@/components/ui/settings-card";
import { SwitchField } from "@/components/ui/switch-field";
import { AssociationField } from "@/components/admin/videos/association-field";
import { PlatformMark } from "@/components/admin/videos/platform-mark";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { CAROUSEL_COUNTS } from "./section-draft";
import type { CarouselSource, FeaturedMode, SectionDraft } from "./section-draft";
import type { AssociationOption } from "@/lib/admin/videos/association-options";
import type { AdminVideo } from "@/lib/admin/videos/types";
import { VIDEO_CATEGORIES } from "@/lib/admin/videos/types";

/**
 * The homepage's video section, as its editor draws it.
 *
 * Built from the shared settings primitives — `SettingsCard`, `ChoiceCard`,
 * `SwitchField` — rather than raw radios and checkboxes. The previous version
 * was a flat column of unstyled inputs: correct, and nothing like the approved
 * design, which groups the settings into four cards and makes each choice a
 * card carrying the consequence of picking it.
 *
 * -- Save lives in the page header ------------------------------------------
 *
 * Not in a sticky bar at the foot of the form. The approved design puts it
 * beside the title with Preview, and the screen is short enough that the
 * button never scrolls away. `onDirtyChange` is how the page above knows
 * whether to enable it — the draft lives here, and the button lives there.
 */

export interface VideoOption {
  id: string;
  label: string;
}

export const VideoSectionEditor = ({
  initial,
  onSave,
  onDirtyChange,
  associationOptions,
  videoOptions,
  videos,
  locale,
}: {
  initial: SectionDraft;
  onSave: (draft: SectionDraft) => void;
  /** Reported upward so the header's Save can be disabled until something
   *  changes. The page owns the button; this owns the draft. */
  onDirtyChange?: (dirty: boolean) => void;
  associationOptions: readonly AssociationOption[];
  videoOptions: readonly VideoOption[];
  /** The published videos, for the chosen video's preview row. */
  videos: readonly AdminVideo[];
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const ids = {
    count: useId(),
    reels: useId(),
    category: useId(),
    featured: useId(),
  };

  useUnsavedGuard(dirty);

  const set = <K extends keyof SectionDraft>(key: K, value: SectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (!dirty) {
      setDirty(true);
      onDirtyChange?.(true);
    }
  };

  const chosen = videos.find((video) => video.id === draft.featuredVideoId);

  return (
    <form
      id="video-section-form"
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setDirty(false);
        onDirtyChange?.(false);
        onSave(draft);
      }}
    >
      {/* 1. What the section is, and whether it is drawn at all. */}
      <SettingsCard
        title={t("sectionTitle")}
        description={t("sectionSubtitle")}
        actions={
          <SwitchField
            id="section-enabled"
            label={t("sectionShow")}
            checked={draft.enabled}
            onChange={(enabled) => set("enabled", enabled)}
          />
        }
      />

      {/* 2. Its words. */}
      <SettingsCard title={t("sectionTexts")} as="h3">
        {/* One per row. Each of these is already TWO inputs, so a two-column
            grid of them is four boxes across — measured at 1440, each ~180px
            wide with its label truncated mid-word. */}
        <div className="flex flex-col gap-5">
          <BilingualField
            id="section-eyebrow"
            labelAr={`${t("sectionEyebrow")} (AR)`}
            labelEn={`${t("sectionEyebrow")} (EN)`}
            valueAr={draft.eyebrow.ar}
            valueEn={draft.eyebrow.en}
            onChangeAr={(value) => set("eyebrow", { ...draft.eyebrow, ar: value })}
            onChangeEn={(value) => set("eyebrow", { ...draft.eyebrow, en: value })}
          />
          <BilingualField
            id="section-heading"
            labelAr={`${t("sectionHeading")} (AR)`}
            labelEn={`${t("sectionHeading")} (EN)`}
            valueAr={draft.heading.ar}
            valueEn={draft.heading.en}
            onChangeAr={(value) => set("heading", { ...draft.heading, ar: value })}
            onChangeEn={(value) => set("heading", { ...draft.heading, en: value })}
          />
        </div>
        {/* Full width: it is a sentence, and a sentence in a half-width box
            wraps four times. */}
        <BilingualField
          id="section-description"
          labelAr={`${t("sectionDescription")} (AR)`}
          labelEn={`${t("sectionDescription")} (EN)`}
          valueAr={draft.description.ar}
          valueEn={draft.description.en}
          onChangeAr={(value) => set("description", { ...draft.description, ar: value })}
          onChangeEn={(value) => set("description", { ...draft.description, en: value })}
        />
      </SettingsCard>

      {/* 3. Which video leads. */}
      <SettingsCard title={t("sectionFeatured")} as="h3">
        <ChoiceCardGroup legend={t("sectionFeatured")} legendHidden columns={2}>
          {(["latest", "specific"] as const).map((mode) => (
            <ChoiceCard<FeaturedMode>
              key={mode}
              name="featuredMode"
              value={mode}
              checked={draft.featuredMode === mode}
              onSelect={(value) => set("featuredMode", value)}
              title={t(mode === "latest" ? "featuredLatest" : "featuredSpecific")}
              description={t(mode === "latest" ? "featuredLatestHint" : "featuredSpecificHint")}
            />
          ))}
        </ChoiceCardGroup>

        {draft.featuredMode === "specific" && videoOptions.length > 0 ? (
          <div className="flex flex-col gap-3">
            <SelectField
              id={ids.featured}
              label={t("featuredSpecific")}
              value={draft.featuredVideoId ?? ""}
              onChange={(event) => set("featuredVideoId", event.target.value || null)}
              options={[
                { value: "", label: "—" },
                ...videoOptions.map((option) => ({ value: option.id, label: option.label })),
              ]}
            />

            {/* The chosen video, as a row: the still, its title, its platform
                and its date. A select showing a title alone leaves the editor
                trusting that the right video is behind the words. */}
            {chosen ? (
              <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-3">
                <span
                  className="flex h-[63px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)]"
                  aria-hidden="true"
                >
                  <PlatformMark platform={chosen.platform} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-body-sm font-semibold text-[color:var(--color-text-primary)]">
                    {chosen.title[locale] || chosen.title.ar || chosen.title.en}
                  </span>
                  <span className="flex items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
                    <span>{t(`category_${chosen.category}`)}</span>
                    {chosen.publishedAt ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(chosen.publishedAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            numberingSystem: "latn",
                          })}
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-semantic-error)_6%,transparent)] p-3 text-caption text-[color:var(--color-text-primary)]">
          {t("featuredLiveNote")}
        </p>
      </SettingsCard>

      {/* 4. What runs beneath it. */}
      <SettingsCard title={t("carouselTitle")} as="h3">
        <ChoiceCardGroup legend={t("carouselSource")} columns={3}>
          {(["latest", "filtered", "manual"] as const).map((source) => (
            <ChoiceCard<CarouselSource>
              key={source}
              name="carouselSource"
              value={source}
              checked={draft.carouselSource === source}
              onSelect={(value) => set("carouselSource", value)}
              title={t(`source${source[0].toUpperCase()}${source.slice(1)}`)}
              description={t(`source${source[0].toUpperCase()}${source.slice(1)}Hint`)}
            />
          ))}
        </ChoiceCardGroup>

        {/* The count is one short answer and takes half the row; the heading
            is a bilingual pair and takes the next one whole. */}
        <div className="md:max-w-[calc(50%-0.625rem)]">
          <SelectField
            id={ids.count}
            label={t("carouselCount")}
            value={String(draft.carouselCount)}
            onChange={(event) => set("carouselCount", Number(event.target.value))}
            options={CAROUSEL_COUNTS.map((count) => ({ value: String(count), label: String(count) }))}
            hint={t("carouselCountHint", { count: draft.carouselCount })}
          />
        </div>
        <BilingualField
          id="carousel-heading"
          labelAr={`${t("carouselHeading")} (AR)`}
          labelEn={`${t("carouselHeading")} (EN)`}
          valueAr={draft.carouselHeading.ar}
          valueEn={draft.carouselHeading.en}
          onChangeAr={(value) => set("carouselHeading", { ...draft.carouselHeading, ar: value })}
          onChangeEn={(value) => set("carouselHeading", { ...draft.carouselHeading, en: value })}
        />

        {/* The narrowing controls belong to one source and appear with it. */}
        {draft.carouselSource === "filtered" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              id={ids.category}
              label={t("categoryLabel")}
              value={draft.carouselCategory ?? ""}
              onChange={(event) => set("carouselCategory", (event.target.value || null) as SectionDraft["carouselCategory"])}
              options={[
                { value: "", label: t("filterAllPlatforms") },
                ...VIDEO_CATEGORIES.map((category) => ({ value: category, label: t(`category_${category}`) })),
              ]}
            />
            <AssociationField
              options={associationOptions}
              value={draft.carouselAssociation}
              onChange={(value) => set("carouselAssociation", value)}
              label={t("associationLabel")}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-body-sm font-semibold text-[color:var(--color-text-primary)]">
              {t("includeReels")}
            </span>
            <span className="text-caption text-[color:var(--color-text-secondary)]">{t("includeReelsHint")}</span>
          </span>
          <SwitchField
            id={ids.reels}
            label={t("includeReels")}
            labelHidden
            checked={draft.includeReels}
            onChange={(value) => set("includeReels", value)}
          />
        </div>
      </SettingsCard>

      {/* The header's Save submits this form by id. A submit button is kept
          here too, hidden, so Enter in a text field still saves — a form whose
          only submit lives outside it loses that. */}
      <Button type="submit" className="sr-only">
        {t("save")}
      </Button>
    </form>
  );
};
