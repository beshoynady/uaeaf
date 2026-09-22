import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { COVERAGE_PLACEHOLDER_COUNT, showsCoveragePlaceholders } from "@/lib/pages/media-coverage";
import { HomeSectionHeader } from "./home-section-header";
import { MediaCoverageCarousel } from "./media-coverage-carousel";
import { PressCoverageCard } from "./press-coverage-card";
import type { PageSectionPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * "UAEAF in the Media" (Homepage Specification §11b, position 8).
 *
 * `section` is the CMS row that gives this section its place on the page and
 * its on/off switch, and nothing more (owner decision 2026-09-22). Its title
 * and sentence are not read: the row was the federation's own
 * `FederationInMedia` shelf, and its words describe that. The section's name
 * is the locked one (§11b), and its sentence is the canvas's.
 *
 * It enters once: the heading, then the cards one after another along the
 * reading direction, then the controls. Under reduced motion it fades in.
 *
 * Until real coverage has a source, the cards are the canvas's bracketed
 * placeholders, drawn outside production only. In production the section is
 * absent, never a heading over nothing.
 */
export const MediaCoverageSection = async ({
  section,
  locale,
}: {
  section: PageSectionPublic;
  locale: AppLocale;
}) => {
  if (!showsCoveragePlaceholders()) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "HomeCoverage" });
  const id = `home-coverage-${section.id}`;

  return (
    <Section labelledBy={id} enter={false} className="py-16">
      <div data-reveal="" data-reveal-reduced="fade" className="flex flex-col gap-9">
        <HomeSectionHeader
          id={id}
          title={t("heading")}
          subtitle={t("subtitle")}
          // The coverage lives on the news page since `/media-coverage` was
          // withdrawn (§11b, amended 2026-09-09).
          link={{ href: "/news#news-in-media", label: t("viewAll"), ariaLabel: t("viewAllLabel") }}
        />
        <MediaCoverageCarousel>
          {Array.from({ length: COVERAGE_PLACEHOLDER_COUNT }, (_, index) => (
            <PressCoverageCard
              key={index}
              logo={t("placeholderLogo", { index: index + 1 })}
              publication={t("placeholderPublication")}
              title={t("placeholderTitle")}
              excerpt={t("placeholderExcerpt")}
              date={{ label: t("placeholderDate") }}
              href="#"
              labels={{ read: t("read"), readLabel: t("readLabel") }}
            />
          ))}
        </MediaCoverageCarousel>
      </div>
    </Section>
  );
};
