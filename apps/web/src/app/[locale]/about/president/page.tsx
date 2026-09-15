import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PresidentHero } from "@/components/pages/president/president-hero";
import { PresidentMessage } from "@/components/pages/president/president-message";
import { RevealOnce } from "@/components/pages/president/reveal-once";
import { ValuesBand } from "@/components/pages/president/values-band";
import { StrategyCta } from "@/components/pages/vision-mission/strategy-cta";
import type { Crumb } from "@/components/ui/breadcrumb";
import type { AppLocale } from "@/i18n/routing";
import { fetchPublic } from "@/lib/api/public-client";
import type { PresidentMessagePublic } from "@/lib/api/types";
import { isIndexable } from "@/lib/pages/indexability";
import { findPublicPage } from "@/lib/pages/public-pages";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * `/about/president` — the President's Message.
 *
 * Reads the Live publication through the public projection (ADR-0069 D3). No
 * Live message means no page to show: the route answers the designed 404
 * rather than an empty hero, and stays out of the index and the sitemap
 * (`indexability.ts`).
 */

const PAGE = findPublicPage("president-message")!;

const loadRecord = () => fetchPublic<PresidentMessagePublic>(PAGE.apiPath);

/** The record's own SEO fields first, then the page's own words: its title,
 *  and the pull-quote, which is the message in one sentence. */
const describe = async (record: PresidentMessagePublic | null, locale: AppLocale) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });
  const site = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: record?.seo?.metaTitle?.[locale] ?? record?.heroTitle[locale] ?? nav("presidentMessage"),
    description:
      record?.seo?.metaDescription?.[locale] ??
      record?.pullQuote?.[locale] ??
      record?.heroSubtitle[locale] ??
      site("description"),
    siteTitle: site("title"),
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
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

  // Chapter 14 §3: a social sharing image on every page. The record's own
  // share image, else the portrait. Added here rather than in `buildMetadata`,
  // which has no image parameter: a shared change is the owner's to approve.
  const image = record?.seo?.ogImage ?? record?.featuredImage;
  if (!image) return metadata;
  const images = [{ url: image.url, width: image.width, height: image.height, alt: image.altText[locale] }];
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, images },
  };
}

export default async function PresidentMessagePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const record = await loadRecord();
  if (!record) notFound();

  const nav = await getTranslations({ locale, namespace: "Nav" });
  const { title, description } = await describe(record, locale);

  // IA §8.5: Home / About / the page, in the structured data only: an
  // institutional page shows no trail (owner decision 2026-09-15, ADR-0072 D7).
  const trail: Crumb[] = [
    { name: nav("home"), route: "/" },
    { name: nav("about"), route: null },
    { name: nav("presidentMessage"), route: PAGE.route },
  ];

  return (
    <>
      <AboutPageJsonLd locale={locale} route={PAGE.route} name={title} description={description} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <PresidentHero
        record={record}
        locale={locale}
      />
      <PresidentMessage record={record} locale={locale} />
      <ValuesBand record={record} locale={locale} />
      <StrategyCta locale={locale} register="neutral" />
      <RevealOnce />
    </>
  );
}
