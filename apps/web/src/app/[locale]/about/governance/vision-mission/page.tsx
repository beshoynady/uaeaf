import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@uaeaf/brand-ui";
import { RevealOnce } from "@/components/pages/president/reveal-once";
import { ValuesBand } from "@/components/pages/president/values-band";
import { StrategicGoals } from "@/components/pages/vision-mission/goals";
import { VisionMissionStatements } from "@/components/pages/vision-mission/statements";
import { StrategyCta } from "@/components/pages/vision-mission/strategy-cta";
import type { Crumb } from "@/components/ui/breadcrumb";
import type { AppLocale } from "@/i18n/routing";
import { fetchPublic } from "@/lib/api/public-client";
import type { VisionMissionPublic } from "@/lib/api/types";
import { isIndexable } from "@/lib/pages/indexability";
import { findPublicPage } from "@/lib/pages/public-pages";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * `/about/governance/vision-mission` — Vision & Mission (ADR-0070).
 *
 * Reads the newest Live publication through the public projection. No Live
 * version means no page: the route answers the designed 404 rather than an
 * empty hero, and stays out of the index and the sitemap (`indexability.ts`).
 *
 * The order is the frames' (Figma `720:483`, `1507:2495`): the hero, the two
 * statements, the goals, the values, the call to the strategic plan. Every
 * section is a `@uaeaf/brand-ui` surface (ADR-0098 D7 institutional recipe):
 * ink hero, canvas statements and goals, the green values band, and the red
 * call inset as a card so it never abuts the green.
 */

/** Rendered per request, as the contact page is and for its reason: a build
 *  that cannot reach the API would otherwise bake the 404 into `.next`. */
export const dynamic = "force-dynamic";

/** ...with the data still cached for `fetchPublic`'s window (Chapter 14 §7). */
export const fetchCache = "default-cache";

const PAGE = findPublicPage("vision-mission")!;

const loadRecord = () => fetchPublic<VisionMissionPublic>(PAGE.apiPath);

/** The record's own SEO fields first, then the page's own words: its title,
 *  and the vision, which is the page in one sentence. */
const describe = async (record: VisionMissionPublic | null, locale: AppLocale) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });
  const site = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: record?.seo?.metaTitle?.[locale] ?? record?.heroTitle[locale] ?? nav("visionMission"),
    description:
      record?.seo?.metaDescription?.[locale] ??
      record?.visionText[locale] ??
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
  // hero's. Added here as the President's Message adds it: `buildMetadata`
  // takes no image, and changing it is a shared change.
  const image = record?.seo?.ogImage ?? record?.heroImage;
  if (!image) return metadata;
  const images = [{ url: image.url, width: image.width, height: image.height, alt: image.altText[locale] }];
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, images },
  };
};

const VisionMissionPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const record = await loadRecord();
  if (!record) notFound();

  const nav = await getTranslations({ locale, namespace: "Nav" });
  const copy = await getTranslations({ locale, namespace: "VisionMission" });
  const pages = await getTranslations({ locale, namespace: "Pages" });
  const { title, description } = await describe(record, locale);

  // IA §8.1: Home / About / Governance & Strategy / the page. The structured
  // data carries all four; the kit's hero shows the ones that are places a
  // reader can go, since "Governance & Strategy" has no page of its own and a
  // crumb without a link would read as the current page.
  const trail: Crumb[] = [
    { name: nav("home"), route: "/" },
    { name: nav("about"), route: null },
    { name: nav("governance"), route: null },
    { name: nav("visionMission"), route: PAGE.route },
  ];

  // The values band takes its heading as stored text; here it is the section's
  // name, the same in the record for either language the page is read in.
  const valuesLabel = copy("values");

  return (
    <>
      <AboutPageJsonLd locale={locale} route={PAGE.route} name={title} description={description} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <PageHero
        title={record.heroTitle[locale]}
        description={<span data-field="heroSubtitle">{record.heroSubtitle[locale]}</span>}
        breadcrumb={[
          { label: nav("home"), href: `/${locale}` },
          { label: nav("about"), href: `/${locale}/about` },
          { label: nav("visionMission") },
        ]}
        breadcrumbLabel={pages("breadcrumbLabel")}
      />
      <VisionMissionStatements record={record} locale={locale} />
      <StrategicGoals record={record} locale={locale} />
      <ValuesBand
        record={{ values: record.coreValues, valuesTitle: { ar: valuesLabel, en: valuesLabel } }}
        locale={locale}
        field="coreValues"
      />
      <StrategyCta locale={locale} />
      <RevealOnce />
    </>
  );
};

export default VisionMissionPage;
