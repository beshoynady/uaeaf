import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeHero } from "@/components/pages/home/hero";
import type { AppLocale } from "@/i18n/routing";
import { RevealOnce } from "@/components/pages/president/reveal-once";
import { OrganizationsSection } from "@/components/pages/home/sponsors/organizations-section";
import { SponsorStrip } from "@/components/pages/home/sponsors/sponsor-strip";
import { SponsorsSection } from "@/components/pages/home/sponsors/sponsors-section";
import { STRIP_DEFAULTS } from "@uaeaf/content/sponsors";
import { loadHomepage, readNextEvent, readPlayback } from "@/lib/pages/homepage";
import { loadSponsorRelations } from "@/lib/pages/sponsor-relations";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * The homepage.
 *
 * Composed from the CMS: a `pages` row with slug `home`, its ordered
 * `pageSections`, and the slides of its HERO section. Built so far: the hero,
 * the global sponsor strip under it, and the sponsors, partners and
 * memberships sections in the page's own order (ADR-0085). The other sections
 * in the approved inventory need sporting data the platform does not hold yet,
 * and a section that renders empty is worse than one that is absent
 * (`docs/plans/homepage-hero-design.md` §6.4); each of the built ones is absent
 * when it has nothing to show.
 *
 * The hero's position is fixed: first on the page, directly below the header,
 * neither reorderable nor hideable from the dashboard (owner decision
 * 2026-09-16). Everything that follows it will be.
 */

/** Rendered per request, as the other API-backed pages are and for their
 *  reason: a build that cannot reach the API would otherwise bake an empty
 *  homepage into `.next`. */
export const dynamic = "force-dynamic";

/** ...with the data still cached for `fetchPublic`'s window (Chapter 14 §7). */
export const fetchCache = "default-cache";

/**
 * Chapter 14 §11 — the homepage is `noindex` until it carries real content.
 *
 * This is derived per render rather than hardcoded, which is the change from
 * the placeholder that stood here. §11's "MUST NOT rely solely on empty
 * fields, placeholders" describes a page with nothing on it; a hero with the
 * federation's own photography, headline and call to action is not that. So
 * the flag follows the content: slides present, indexable; no slides — the
 * API is down, or an editor has not filled the page in — and the front door
 * stays out of the index rather than being cached by a search engine in its
 * empty state.
 */
const isIndexable = (slideCount: number) => slideCount > 0;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const { page, heroSlides } = await loadHomepage();

  return buildMetadata({
    locale,
    route: "/",
    title: page?.seo?.metaTitle?.[locale] ?? t("title"),
    description: page?.seo?.metaDescription?.[locale] ?? t("description"),
    indexable: isIndexable(heroSlides.length),
  });
};

const HomePage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { heroSlides, heroSection, sections } = await loadHomepage();

  // No slides means the API is unreachable or the page has not been filled in.
  // The route still has to answer with something a person can read, and PR-010
  // forbids showing the public a "coming soon" — so it answers with the site's
  // own name and one honest sentence, and `generateMetadata` keeps it out of
  // the index for exactly as long as that is what it says.
  if (heroSlides.length === 0) {
    const t = await getTranslations("HomePage");
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-20 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <h1 className="rise-in text-h1 text-[color:var(--color-text-primary)]">{t("title")}</h1>
        <p
          className="rise-in text-body text-[color:var(--color-text-secondary)]"
          style={{ "--rise-index": 1 } as React.CSSProperties}
        >
          {t("description")}
        </p>
      </div>
    );
  }

  const relations = await loadSponsorRelations(sections);
  const now = new Date();

  return (
    <>
      <HomeHero
        slides={heroSlides}
        locale={locale}
        nextEvent={readNextEvent(heroSection, locale)}
        playback={readPlayback(heroSection)}
      />
      {/* Under the hero, outside the first screen (ADR-0078 D3). */}
      <SponsorStrip
        sponsorships={relations.sponsorships}
        settings={relations.strip ?? { ...STRIP_DEFAULTS, sponsorshipIds: [] }}
        locale={locale}
        now={now}
      />
      {relations.sections.map((section) =>
        section.sectionType === "SPONSORS" ? (
          <SponsorsSection key={section.id} sponsorships={relations.sponsorships} section={section} locale={locale} now={now} />
        ) : (
          <OrganizationsSection
            key={section.id}
            kind={section.sectionType === "PARTNERS" ? "partners" : "memberships"}
            items={section.sectionType === "PARTNERS" ? relations.partners : relations.memberships}
            section={section}
            locale={locale}
          />
        ),
      )}
      <RevealOnce />
    </>
  );
};

export default HomePage;
