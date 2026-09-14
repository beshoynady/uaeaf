import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { PHOTO_PANEL, PhotoGround } from "@/components/ui/photo-ground";
import { Section } from "@/components/ui/section";
import { HERO_MEASURE } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicImage } from "@/lib/api/types";

/**
 * The closing call to the strategic plan (Figma `1178:2506`, EN `1507:2654`).
 *
 * The words are the frames', transcribed into the `VisionMission` messages
 * rather than stored: they point at two places in the site's navigation, not
 * at anything this page's record says, as the header's labels do (ADR-0070).
 * Its photograph is stored: every picture the page prints is content with a
 * field (owner rule 2026-09-14). With one, the call stands on it in a panel
 * the width of the container; without one, on the neutral band.
 *
 * Both destinations are the routes IA §8.1 gives them, the same ones the
 * header already links. The strategic plan is the next page to be built.
 *
 * - The primary action is the plan, the lesser errand is About; the recipes
 *   are the contact page's own: the form's filled green and the map's outlined
 *   link (ADR-0068 D1). Both are opaque, so neither depends on the ground.
 * - The arrow points along the reading direction and is hidden from assistive
 *   technology, which already has the link's name.
 */

/** The focus ring is added where each link is drawn, as the contact map does,
 *  so the interaction-state contract sees it at the call site. */
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--button-radius)] px-4 py-3.5 text-body-sm font-semibold ${TRANSITION}`;

const PRIMARY = `${BUTTON} bg-[color:var(--button-primary-background)] text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)]`;

const SECONDARY = `${BUTTON} border border-[color:var(--color-green-500)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-link)] hover:bg-[color-mix(in_srgb,var(--color-green-500)_8%,var(--color-surface-base))] active:bg-[color-mix(in_srgb,var(--color-green-500)_16%,var(--color-surface-base))]`;

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const StrategyCta = async ({ locale, ground = null }: { locale: AppLocale; ground?: PublicImage | null }) => {
  const t = await getTranslations({ locale, namespace: "VisionMission" });
  const titleId = "vision-mission-cta-title";

  const call = (
    <div data-reveal="" className={`mx-auto flex ${HERO_MEASURE} flex-col items-center gap-4 text-center`}>
      <h2
        id={titleId}
        data-reveal-part="rise"
        className={`text-h2 text-balance ${ground ? "" : "text-[color:var(--color-text-primary)]"}`}
      >
        {t("ctaTitle")}
      </h2>
      <p
        data-reveal-part="rise"
        style={revealStep(1)}
        className={`text-body-lg text-pretty ${ground ? "opacity-85" : "text-[color:var(--color-text-secondary)]"}`}
      >
        {t("ctaText")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link href="/about/governance/strategic-plan" className={`${PRIMARY} ${FOCUS}`}>
          {t("ctaPrimary")}
        </Link>
        <Link href="/about" className={`${SECONDARY} ${FOCUS}`}>
          {t("ctaSecondary")}
          <span aria-hidden="true" className="rtl:-scale-x-100">
            →
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <Section enter={false} labelledBy={titleId} className="py-12 md:py-16">
      {ground ? (
        <div className={`${PHOTO_PANEL} px-6 py-12 md:px-12 md:py-16`}>
          <PhotoGround image={ground} locale={locale} />
          {call}
        </div>
      ) : (
        call
      )}
    </Section>
  );
};
