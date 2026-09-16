import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { FOCUS } from "@/components/ui/interactive";
import { Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import { HERO_MEASURE } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PublicImage } from "@/lib/api/types";
import { PLAN_PRIMARY, PLAN_SECONDARY } from "./plan-buttons";

/**
 * The closing call, «نبني اليوم مستقبل ألعاب القوى الإماراتية» (Figma
 * `758:243`), on the page's ground after the green execution band (ADR-0075).
 *
 * - Figma sets it in a rounded panel on a dark photograph. Here the words hold
 *   seven of the twelve columns at the start and the photograph the other five
 *   at the end, cut on a slant and running to the page edge (`SlantedPhoto`),
 *   as the Vision & Mission call does; without a photograph the call is one
 *   centred column.
 * - The title and the text are the record's. The two actions point at two
 *   places in the site's navigation, so their names are the navigation's
 *   (IA §8.1) rather than stored fields, as on Vision & Mission's call: the
 *   Vision & Mission as the primary, the policies as the secondary. The frame's
 *   two text links become the button pair the site uses for a call.
 * - The arrows point along the reading direction and are hidden from assistive
 *   technology, which already has each link's name.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

const Arrow = () => (
  <span aria-hidden="true" className="rtl:-scale-x-100">
    →
  </span>
);

export const PlanCta = async ({
  title,
  text,
  image,
  locale,
  sizes,
}: {
  title: LocalizedText;
  text: LocalizedText | null;
  image: PublicImage | null;
  locale: AppLocale;
  sizes: string;
}) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });
  const titleId = "strategic-plan-cta-title";

  return (
    <Section enter={false} labelledBy={titleId} ground="base" className="relative isolate overflow-clip py-12 md:py-16 lg:py-24">
      <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div
          data-reveal=""
          className={`flex ${HERO_MEASURE} flex-col gap-4 ${image ? "items-start text-start lg:col-span-7 lg:col-start-1" : "mx-auto items-center text-center"}`}
        >
          <h2 id={titleId} data-reveal-part="rise" className="text-h2 text-balance text-[color:var(--color-text-primary)]">
            <span data-field="ctaTitle">{title[locale]}</span>
          </h2>
          {text ? (
            <p
              data-field="ctaText"
              data-reveal-part="rise"
              style={revealStep(1)}
              className="text-body-lg text-pretty text-[color:var(--color-text-secondary)]"
            >
              {text[locale]}
            </p>
          ) : null}
          <div
            data-reveal-part="rise"
            style={revealStep(2)}
            className={`mt-4 flex flex-wrap items-center gap-3 ${image ? "" : "justify-center"}`}
          >
            <Link href="/about/governance/vision-mission" className={`${PLAN_PRIMARY} ${FOCUS}`}>
              {nav("visionMission")}
              <Arrow />
            </Link>
            <Link href="/about/governance/policies" className={`${PLAN_SECONDARY} ${FOCUS}`}>
              {nav("policies")}
              <Arrow />
            </Link>
          </div>
        </div>

        {image ? <SlantedPhoto image={image} locale={locale} side="end" sizes={sizes} /> : null}
      </div>
    </Section>
  );
};
