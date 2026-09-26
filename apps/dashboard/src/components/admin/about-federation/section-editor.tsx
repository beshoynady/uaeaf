"use client";

import { useTranslations } from "next-intl";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";
import { SECTION_ORDER } from "@/lib/admin/about-readiness";
import type { AboutDraft, AboutSectionKey } from "@/lib/admin/about-readiness";
import { HeroFields } from "./sections/hero-fields";
import { FactsFields } from "./sections/facts-fields";
import { StoryFields } from "./sections/story-fields";
import { TimelineFields } from "./sections/timeline-fields";
import { AchievementsFields } from "./sections/achievements-fields";
import { PioneersFields } from "./sections/pioneers-fields";
import { LeadershipFields } from "./sections/leadership-fields";
import { GovernanceFields } from "./sections/governance-fields";
import { EcosystemFields, type EcosystemFigure } from "./sections/ecosystem-fields";
import { CtaFields } from "./sections/cta-fields";

/**
 * The selected section's fields, under its own number and name.
 *
 * A dispatcher rather than ten conditionals inside the editor: a new section
 * is then one file and one line here, and no section component can reach any
 * part of the draft but its own — `patch` is bound to one key before it is
 * handed over.
 */
export const SectionEditor = ({
  sectionKey,
  draft,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
  figures,
}: {
  sectionKey: AboutSectionKey;
  draft: AboutDraft;
  patch: <K extends AboutSectionKey>(key: K) => (change: Partial<AboutDraft[K]>) => void;
  disabled: boolean;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
  /** The counted figures, for the ecosystem section's read-only panel. */
  figures: readonly EcosystemFigure[];
}) => {
  const t = useTranslations("AboutFederation");
  const number = SECTION_ORDER.indexOf(sectionKey) + 1;

  const shared = { disabled, images, canReadMedia, locale, onUploaded } as const;

  return (
    <section
      aria-labelledby="about-section-title"
      className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-6"
    >
      <div className="flex flex-col gap-1 border-b border-[color:var(--color-border-subtle)] pb-4">
        <h3 id="about-section-title" className="text-heading-sm font-bold">
          {number} · {t(`section.${sectionKey}`)}
        </h3>
        <p className="text-label leading-relaxed text-[color:var(--color-text-muted)]">
          {t(`section.note.${sectionKey}`)}
        </p>
      </div>

      {sectionKey === "hero" ? (
        <HeroFields value={draft.hero} patch={patch("hero")} {...shared} />
      ) : sectionKey === "facts" ? (
        <FactsFields value={draft.facts} patch={patch("facts")} {...shared} />
      ) : sectionKey === "story" ? (
        <StoryFields value={draft.story} patch={patch("story")} {...shared} />
      ) : sectionKey === "timeline" ? (
        <TimelineFields value={draft.timeline} patch={patch("timeline")} {...shared} />
      ) : sectionKey === "achievements" ? (
        <AchievementsFields value={draft.achievements} patch={patch("achievements")} {...shared} />
      ) : sectionKey === "pioneers" ? (
        <PioneersFields value={draft.pioneers} patch={patch("pioneers")} {...shared} />
      ) : sectionKey === "leadership" ? (
        <LeadershipFields value={draft.leadership} patch={patch("leadership")} {...shared} />
      ) : sectionKey === "governance" ? (
        <GovernanceFields value={draft.governance} patch={patch("governance")} {...shared} />
      ) : sectionKey === "ecosystem" ? (
        <EcosystemFields value={draft.ecosystem} patch={patch("ecosystem")} stats={figures} {...shared} />
      ) : (
        <CtaFields value={draft.cta} patch={patch("cta")} {...shared} />
      )}
    </section>
  );
};
