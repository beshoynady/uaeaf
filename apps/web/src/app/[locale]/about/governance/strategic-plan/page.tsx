import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IdentityHero } from "@/components/ui/identity-hero";
import { RevealOnce } from "@/components/pages/president/reveal-once";
import { PlanExecutionPath } from "@/components/pages/strategic-plan/execution-path";
import { PlanMetrics } from "@/components/pages/strategic-plan/metrics";
import { PlanObjectives } from "@/components/pages/strategic-plan/objectives";
import { PlanOverview } from "@/components/pages/strategic-plan/overview";
import { PlanPhasesBand } from "@/components/pages/strategic-plan/phases-band";
import { PlanPillars } from "@/components/pages/strategic-plan/pillars";
import { PlanCta } from "@/components/pages/strategic-plan/plan-cta";
import type { Crumb } from "@/components/ui/breadcrumb";
import type { AppLocale } from "@/i18n/routing";
import { fetchPublic } from "@/lib/api/public-client";
import type { StrategicPlanPublic } from "@/lib/api/types";
import { isIndexable } from "@/lib/pages/indexability";
import { findPublicPage } from "@/lib/pages/public-pages";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { withheldPage } from "@/components/pages/page-inactive-screen";

/**
 * `/about/governance/strategic-plan` — the Strategic Plan (ADR-0075).
 *
 * Reads the newest Live publication through the public projection. No Live
 * version means no page: the route answers the designed 404 rather than an
 * empty hero, and stays out of the index and the sitemap (`indexability.ts`).
 *
 * The order is the frame's (Figma `720:624`) less its documents section
 * (owner correction 2026-09-15): the hero, the overview, the phases, the
 * pillars, the objectives, the indicators, the execution path, the call. The
 * order and each section's composition are the page's, not the record's: the
 * page rules (guide §٨) hold on this sequence, and the record decides only
 * what each section says and shows.
 *
 * Every section is a `@uaeaf/brand-ui` surface (ADR-0098 D7 institutional
 * recipe): ink hero; canvas overview; green phases; canvas pillars and
 * objectives; ink indicators; green execution path; and the red call inset as
 * a card, so it never abuts the green band before it.
 */

/** Rendered per request, as Vision & Mission is and for its reason: a build
 *  that cannot reach the API would otherwise bake the 404 into `.next`. */
export const dynamic = "force-dynamic";

/** ...with the data still cached for `fetchPublic`'s window (Chapter 14 §7). */
export const fetchCache = "default-cache";

const KEY = "strategic-plan";
const PAGE = findPublicPage(KEY)!;

const loadRecord = () => fetchPublic<StrategicPlanPublic>(PAGE.apiPath);

/**
 * `sizes` for each slanted photograph, from the crop it shows (brief §٣): from
 * `lg` the picture covers its section's height, so the file the browser needs
 * is that height times the picture's own ratio, not the column's width. The
 * heights are the sections' at 1440, measured on the built page; below `lg`
 * the picture takes the column's full width.
 */
const SECTION_HEIGHT = { overview: 340, objectives: 770, metrics: 510 } as const;

const sizesFor = (image: { width: number; height: number } | null, section: keyof typeof SECTION_HEIGHT): string => {
  if (!image) return "100vw";
  const covered = Math.ceil(((SECTION_HEIGHT[section] * image.width) / image.height / 1440) * 100);
  return `(min-width: 1024px) ${Math.min(100, covered)}vw, 100vw`;
};

/** The record's own SEO fields first, then the page's own words: its title,
 *  and the overview, which is the plan in one sentence. */
const describe = async (record: StrategicPlanPublic | null, locale: AppLocale) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });
  const site = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: record?.seo?.metaTitle?.[locale] ?? record?.heroTitle[locale] ?? nav("strategicPlan"),
    description:
      record?.seo?.metaDescription?.[locale] ??
      record?.introText[locale] ??
      record?.heroSubtitle[locale] ??
      site("description"),
    siteTitle: site("title"),
  };
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const record = await loadRecord();
  const { title, description, siteTitle } = await describe(record, locale);

  const metadata = buildMetadata({
    locale,
    route: PAGE.route,
    title: `${title} | ${siteTitle}`,
    description,
    indexable: await isIndexable(PAGE),
  });

  // Chapter 14 §3: a sharing image on every page — the record's own, else the
  // hero's, as the two built pages add it.
  const image = record?.seo?.ogImage ?? record?.heroImage;
  if (!image) return metadata;
  const images = [{ url: image.url, width: image.width, height: image.height, alt: image.altText[locale] }];
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, images },
  };
};

const StrategicPlanPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const record = await loadRecord();
  if (!record) notFound();

  // Switched off by the federation: the API answers with the switch and no
  // content at all, so there is nothing here to render and nothing to leak
  // (ADR-0102 §D2). The address stays, and answers 200.
  const withheld = await withheldPage(KEY, locale);
  if (withheld) return withheld;

  const nav = await getTranslations({ locale, namespace: "Nav" });
  const copy = await getTranslations({ locale, namespace: "StrategicPlan" });
  const { title, description } = await describe(record, locale);

  // IA §8.1: Home / About / Governance & Strategy / the page. The structured
  // data carries all four; the kit's hero shows the ones a reader can go to,
  // since "Governance & Strategy" has no page and an unlinked crumb would read
  // as the current page.
  const trail: Crumb[] = [
    { name: nav("home"), route: "/" },
    { name: nav("about"), route: null },
    { name: nav("governance"), route: null },
    { name: nav("strategicPlan"), route: PAGE.route },
  ];

  return (
    <>
      <AboutPageJsonLd locale={locale} route={PAGE.route} name={title} description={description} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <IdentityHero
        titleId="strategic-plan-hero-title"
        eyebrow={nav("governance")}
        title={record.heroTitle[locale]}
        subtitle={record.heroSubtitle[locale]}
        subtitleField="heroSubtitle"
        ground={record.heroImage}
        locale={locale}
      />
      <PlanOverview record={record} locale={locale} sizes={sizesFor(record.introImage, "overview")} />
      <PlanPhasesBand phases={record.phases} title={record.phasesTitle?.[locale] ?? null} label={copy("phasesLabel")} locale={locale} />
      <PlanPillars pillars={record.pillars} title={record.pillarsTitle} text={record.pillarsText} locale={locale} />
      <PlanObjectives
        objectives={record.objectives}
        title={record.objectivesTitle}
        image={record.objectivesImage}
        locale={locale}
        sizes={sizesFor(record.objectivesImage, "objectives")}
      />
      <PlanMetrics
        metrics={record.metrics}
        title={record.metricsTitle}
        label={copy("metricsLabel")}
        image={record.metricsImage}
        locale={locale}
        sizes={sizesFor(record.metricsImage, "metrics")}
      />
      <PlanExecutionPath
        steps={record.executionSteps}
        title={record.executionTitle}
        text={record.executionText}
        label={copy("executionLabel")}
        locale={locale}
      />
      <PlanCta title={record.ctaTitle} text={record.ctaText} locale={locale} />
      <RevealOnce />
    </>
  );
};

export default StrategicPlanPage;
