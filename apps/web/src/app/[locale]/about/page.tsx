import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutInactiveScreen } from "@/components/pages/about/inactive-screen";
import { AboutScreen } from "@/components/pages/about/about-screen";
import type { AppLocale } from "@/i18n/routing";
import { fetchPublic } from "@/lib/api/public-client";
import type { AboutPage } from "@/lib/about/types";
import { isIndexable } from "@/lib/pages/indexability";
import { findPublicPage } from "@/lib/pages/public-pages";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * `/about` — About the Federation (ADR-0101).
 *
 * Three states, and the difference between the last two matters:
 *
 * - **No Live publication**: the designed 404, as every workflow-governed page
 *   answers. Nothing has ever been published here.
 * - **Published but switched off** (`isActive: false`): the address works and
 *   the page is named, but its content is withheld. The API sends nothing but
 *   the switch, so there is no draft in the response to leak, and the route
 *   draws the in-preparation screen and marks itself `noindex`.
 * - **Live**: the full page.
 *
 * The section order is the page's, fixed in code (ADR-0101 D3); the record
 * decides only which sections are present and what each one says.
 */

/** Rendered per request, as the other governance pages are and for their
 *  reason: a build that cannot reach the API would otherwise bake the 404
 *  into `.next`. */
export const dynamic = "force-dynamic";

/** ...with the data still cached for `fetchPublic`'s window (Chapter 14 §7). */
export const fetchCache = "default-cache";

const PAGE = findPublicPage("about")!;

const loadRecord = () => fetchPublic<AboutPage>(PAGE.apiPath);

/** The record's own SEO fields first, then the page's own words. */
const describe = async (record: AboutPage | null, locale: AppLocale) => {
  const pages = await getTranslations({ locale, namespace: "Pages" });
  const site = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: record?.seo?.metaTitle?.[locale] ?? record?.hero?.title[locale] ?? pages("about"),
    description:
      record?.seo?.metaDescription?.[locale] ?? record?.hero?.description[locale] ?? site("description"),
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
    // A switched-off page shows a title and one status line, which Chapter 14
    // §11 puts below the threshold for indexing whatever the registry says.
    indexable: record?.isActive === true && (await isIndexable(PAGE)),
  });

  const image = record?.seo?.ogImage ?? record?.hero?.image;
  if (!image) {
    return metadata;
  }
  const images = [
    { url: image.url, width: image.width, height: image.height, alt: image.altText?.[locale] ?? "" },
  ];
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, images },
  };
};

const AboutFederationPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const record = await loadRecord();
  if (!record) {
    notFound();
  }

  if (record.isActive !== true) {
    return <AboutInactiveScreen locale={locale} />;
  }

  const { title, description } = await describe(record, locale);

  return <AboutScreen page={record} locale={locale} title={title} description={description} route={PAGE.route} />;
};

export default AboutFederationPage;
