import { getTranslations } from "next-intl/server";
import { RevealOnce } from "@/components/pages/president/reveal-once";
import type { Crumb } from "@/components/ui/breadcrumb";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage } from "@/lib/about/types";
import { AboutOrganizationJsonLd } from "./about-jsonld";
import { AboutHero } from "./sections/about-hero";
import { AboutFacts } from "./sections/about-facts";
import { AboutStory } from "./sections/about-story";
import { AboutTimeline } from "./sections/about-timeline";
import { AboutAchievements } from "./sections/about-achievements";
import { AboutPioneers } from "./sections/about-pioneers";
import { AboutLeadership } from "./sections/about-leadership";
import { AboutGovernance } from "./sections/about-governance";
import { AboutEcosystem } from "./sections/about-ecosystem";
import { AboutCta } from "./sections/about-cta";

/**
 * The About page, in the order it is printed.
 *
 * ── Why the order is here and not in the record ───────────────────────────
 *
 * It carries two things an editor reordering rows could not see: the identity
 * guide's colour cadence, and the sequence the nine scroll scenes are composed
 * against (ADR-0101 D3). So it is written once, here, as the shape of this
 * function.
 *
 * ── Why every section is a conditional render ─────────────────────────────
 *
 * The API has already removed what a visitor must not see — sections switched
 * off, items hidden, milestones without a confirmed date, and any section left
 * empty by those removals. So a missing section is simply absent from the
 * response, and the page renders what arrived. Nothing is hidden with CSS and
 * nothing is skipped in the markup: what is not here was never sent, which is
 * what keeps the federation's unfinished wording out of "view source".
 *
 * The consequence every section component must respect: it owns its own scroll
 * hooks. Putting them here would make them conditional on a neighbour
 * existing, which is a hook order that changes between renders.
 */
export const AboutScreen = async ({
  page,
  locale,
  title,
  description,
  route,
}: {
  page: AboutPage;
  locale: AppLocale;
  title: string;
  description: string;
  route: string;
}) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });
  const pages = await getTranslations({ locale, namespace: "Pages" });
  // The organisation's own name, from the one place the site already states it
  // in each language, rather than a second copy that could drift from it.
  const footer = await getTranslations({ locale, namespace: "Footer" });

  // IA §8.1: Home / About. "About" is this page, so the trail is two deep and
  // the last crumb is not a link.
  const trail: Crumb[] = [
    { name: nav("home"), route: "/" },
    { name: pages("about"), route },
  ];

  return (
    <>
      <AboutOrganizationJsonLd locale={locale} name={footer("brandName")} description={description} />
      <AboutPageJsonLd locale={locale} route={route} name={title} description={description} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      {page.hero ? <AboutHero hero={page.hero} locale={locale} /> : null}
      {page.facts ? <AboutFacts facts={page.facts} locale={locale} /> : null}
      {page.story ? <AboutStory story={page.story} locale={locale} /> : null}
      {page.timeline ? <AboutTimeline timeline={page.timeline} locale={locale} /> : null}
      {page.achievements ? <AboutAchievements achievements={page.achievements} locale={locale} /> : null}
      {page.pioneers ? <AboutPioneers pioneers={page.pioneers} locale={locale} /> : null}
      {page.leadership ? <AboutLeadership leadership={page.leadership} locale={locale} /> : null}
      {page.governance ? <AboutGovernance governance={page.governance} locale={locale} /> : null}
      {page.ecosystem ? <AboutEcosystem ecosystem={page.ecosystem} locale={locale} /> : null}
      {page.cta ? <AboutCta cta={page.cta} locale={locale} /> : null}

      <RevealOnce />
    </>
  );
};
