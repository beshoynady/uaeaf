import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildStaticPageMetadata, loadStaticPage } from "@/components/pages/static-page-screen";
import { EditorialHero } from "@/components/pages/news/editorial-hero";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "albums";

/**
 * Chapter 14 §11 — Minimum Content Threshold.
 *
 * `GET /albums/public/:slug` resolves one album by slug; there is no public
 * list to build an index from. §11's ruling on exactly this situation: the
 * page "MAY exist internally within the platform but SHOULD remain temporarily
 * `noindex` until the required content is complete." So the page ships — its
 * hero is real, editor-managed content and the URL is stable — and stays
 * `noindex, follow` until there is a list to show. The decision lives in
 * `lib/pages/indexability.ts`, so the robots directive and the sitemap (§13)
 * are read from one function.
 *
 * The hero is the kit's editorial `PageHero` (ADR-0098), the same one the news
 * listing opens with. No list, so no filter row and no empty state: an empty
 * state would need a sentence the page record does not carry, and inventing
 * one is not this page's to do.
 */

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const AlbumsPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { title, subtitle, heroImage } = await loadStaticPage(KEY, locale);

  return (
    <EditorialHero pageKey={KEY} locale={locale} title={title} subtitle={subtitle} heroImage={heroImage} />
  );
};

export default AlbumsPage;
