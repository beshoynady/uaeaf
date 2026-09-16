import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { SeamLines } from "@/components/ui/identity-hero";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { REGISTER_CLASSES, Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import { HERO_MEASURE } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicImage } from "@/lib/api/types";

/**
 * The closing call to the strategic plan (Figma `1178:2506`, EN `1507:2654`;
 * ADR-0072 D5).
 *
 * The words are the frames', transcribed into the `VisionMission` messages
 * rather than stored: they point at two places in the site's navigation, not
 * at anything a page's record says, as the header's labels do (ADR-0070). Its
 * photograph is stored where a record has one: every picture a page prints is
 * content with a field (owner rule 2026-09-14).
 *
 * - The band takes the ground opposite the section before it: the neutral
 *   ground after the green values, on both pages (ADR-0074 D2).
 * - With a photograph, the words hold seven of the twelve columns from `lg` at
 *   the start and the photograph the other five at the end, cut on a slant
 *   and running to the page edge (`SlantedPhoto`); below `lg` the photograph
 *   follows the words. Without one,
 *   the call is one centred column.
 * - The primary action is the plan, the lesser errand is About. Both links
 *   resolve (the plan's page is in preparation). The primary is the button
 *   recipe on the page's ground and the band's inverse on the green register,
 *   so it always outweighs the secondary: an outline in the band's text colour
 *   on green, and in the accent colour on the page's ground.
 * - The arrows point along the reading direction and are hidden from assistive
 *   technology, which already has each link's name.
 * - On the neutral ground with no photograph the call has no section-scale
 *   identity element (rule 1), and it follows the green values band, so from
 *   `lg` its words take the start of the line, as they do beside a photograph,
 *   and the identity strokes stand below the seam in the far corner, wholly on
 *   the page's ground (`SeamLines placement="below" from="lg"`, ADR-0075
 *   M0-B). Below `lg` the heading spans the frame and the guard measured the
 *   strokes 0–16.5px from it, so they are not drawn there and the finding
 *   stays recorded for those widths. With a photograph the picture is the
 *   element; on the green register the register is.
 */

/** The focus ring is added where each link is drawn, so the interaction-state
 *  contract sees it at the call site. */
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--button-radius)] px-4 py-3.5 text-body-sm font-semibold ${TRANSITION}`;

const PRIMARY = `${BUTTON} bg-[color:var(--button-primary-background)] text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)]`;

/** On the green register the primary takes the band's inverse: the band's text
 *  colour as its ground and the band's colour as its text, 9.40:1, and 6.1:1 at
 *  its pressed step. The button recipe's green fill measured 1.95:1 against the
 *  band, so the outlined secondary outweighed it. */
const PRIMARY_ON_GREEN = `${BUTTON} bg-[color:var(--color-section-green-text)] text-[color:var(--color-section-green-surface)] hover:bg-[color-mix(in_srgb,var(--color-section-green-text)_88%,var(--color-section-green-surface))] active:bg-[color-mix(in_srgb,var(--color-section-green-text)_76%,var(--color-section-green-surface))]`;

const SECONDARY = `${BUTTON} border border-[color:var(--color-border-accent)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-link)] hover:bg-[color-mix(in_srgb,var(--color-border-accent)_8%,var(--color-surface-base))] active:bg-[color-mix(in_srgb,var(--color-border-accent)_16%,var(--color-surface-base))]`;

const SECONDARY_ON_GREEN = `${BUTTON} border border-[color:var(--color-section-green-text)] text-[color:var(--color-section-green-text)] hover:bg-[color-mix(in_srgb,var(--color-section-green-text)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--color-section-green-text)_20%,transparent)]`;

const Arrow = () => (
  <span aria-hidden="true" className="rtl:-scale-x-100">
    →
  </span>
);

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const StrategyCta = async ({
  locale,
  ground = null,
  register = "green",
}: {
  locale: AppLocale;
  ground?: PublicImage | null;
  register?: "green" | "neutral";
}) => {
  const t = await getTranslations({ locale, namespace: "VisionMission" });
  const titleId = "vision-mission-cta-title";
  const onGreen = register === "green";
  const seamLines = !onGreen && !ground;

  return (
    <Section
      register={register}
      enter={false}
      labelledBy={titleId}
      // Sideways clipping only where the strokes stand below the seam: `overflow-clip`
      // would cut nothing there, but the photograph's bleed still needs the clip.
      className={`relative isolate ${seamLines ? "overflow-x-clip" : "overflow-clip"} py-12 md:py-16 lg:py-24`}
    >
      {seamLines ? <SeamLines placement="below" from="lg" /> : null}
      <div className={ground || seamLines ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div
          data-reveal=""
          className={`flex ${HERO_MEASURE} flex-col gap-4 ${
            ground
              ? "items-start text-start lg:col-span-7 lg:col-start-1"
              : seamLines
                ? "mx-auto items-center text-center lg:mx-0 lg:col-span-7 lg:col-start-1 lg:items-start lg:text-start"
                : "mx-auto items-center text-center"
          }`}
        >
          <h2 id={titleId} data-reveal-part="rise" className="text-h2 text-balance">
            {t("ctaTitle")}
          </h2>
          <p
            data-reveal-part="rise"
            style={revealStep(1)}
            className={`text-body-lg text-pretty ${onGreen ? REGISTER_CLASSES.green.muted : "text-[color:var(--color-text-secondary)]"}`}
          >
            {t("ctaText")}
          </p>
          <div
            data-reveal-part="rise"
            style={revealStep(2)}
            className={`mt-4 flex flex-wrap items-center gap-3 ${ground ? "" : seamLines ? "justify-center lg:justify-start" : "justify-center"}`}
          >
            <Link href="/about/governance/strategic-plan" className={`${onGreen ? PRIMARY_ON_GREEN : PRIMARY} ${FOCUS}`}>
              {t("ctaPrimary")}
              <Arrow />
            </Link>
            <Link href="/about" className={`${onGreen ? SECONDARY_ON_GREEN : SECONDARY} ${FOCUS}`}>
              {t("ctaSecondary")}
              <Arrow />
            </Link>
          </div>
        </div>

        {ground ? <SlantedPhoto image={ground} locale={locale} side="end" sizes="(min-width: 1024px) 42vw, 100vw" /> : null}
      </div>
    </Section>
  );
};
