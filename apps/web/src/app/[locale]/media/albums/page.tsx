import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import {
  buildStaticPageMetadata,
  loadStaticPage,
} from "@/components/pages/static-page-screen";
import { AlbumsGalleryScreen } from "@/components/pages/albums/albums-gallery-screen";
import { readAlbumQuery } from "@/lib/albums/album-query";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";
import {
  ALBUMS_PAGE_SIZE,
  MAX_MORE,
  loadAlbumFacets,
  loadAlbumList,
  loadAlbumStats,
  loadFacetNames,
  loadFeaturedAlbum,
  readMoreParam,
} from "./_data/load";
import { withShareImage } from "./_data/seo";
import { withheldPage } from "@/components/pages/page-inactive-screen";

/**
 * The photo gallery: `/media/albums`.
 *
 * -- The address is the view ---------------------------------------------------
 *
 * Every filter, the page and the phone's "show more" depth are in the query
 * string, so this is a Server Component that reads `searchParams` and fetches
 * again on every change. Rendered per request for that reason; each read
 * underneath is still cached for `PUBLIC_REVALIDATE_SECONDS`.
 *
 * -- Chapter 14 §11 ------------------------------------------------------------
 *
 * The robots directive comes from `isIndexable`, the one function the sitemap
 * reads too, so the two cannot disagree. It has no case for this page yet, so
 * the page stays `noindex, follow` — which is also the correct answer while
 * nothing is published. Adding the case (one published album is the
 * threshold, as for the video library) belongs to that file.
 *
 * -- Canonical ----------------------------------------------------------------
 *
 * Every filtered, paged or extended view canonicalises to the unfiltered
 * archive (§14), which is what `buildMetadata` emits for the route.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

const KEY = "albums";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const [metadata, featured, { heroImage }] = await Promise.all([
    isIndexable(findPublicPage(KEY)!).then((indexable) =>
      buildStaticPageMetadata(KEY, locale, indexable),
    ),
    loadFeaturedAlbum(),
    loadStaticPage(KEY, locale),
  ]);

  // The featured album's cover is the gallery's best picture; the page
  // record's own hero photograph is the fallback.
  const cover = featured?.album.previewPhotos[0] ?? heroImage;
  return withShareImage(metadata, cover, locale);
};

const AlbumsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Switched off by the federation: the address stays, the content does not
  // (ADR-0102 §D2). This is the TODO that stood here.
  const withheld = await withheldPage(KEY, locale);
  if (withheld) return withheld;

  const search = await searchParams;
  const query = readAlbumQuery(search);
  const more = readMoreParam(search);

  const [{ title, subtitle, heroImage }, stats, featured, list, facets] =
    await Promise.all([
      loadStaticPage(KEY, locale),
      loadAlbumStats(),
      loadFeaturedAlbum(),
      loadAlbumList(query, more),
      loadAlbumFacets(),
    ]);
  const names = await loadFacetNames(facets);

  return (
    <AlbumsGalleryScreen
      locale={locale}
      title={title}
      subtitle={subtitle}
      heroImage={heroImage}
      stats={stats}
      featured={featured}
      albums={list?.items ?? []}
      total={list?.total ?? 0}
      facets={facets}
      names={names}
      query={query}
      more={more}
      pageSize={ALBUMS_PAGE_SIZE}
      maxMore={MAX_MORE}
    />
  );
};

export default AlbumsPage;
