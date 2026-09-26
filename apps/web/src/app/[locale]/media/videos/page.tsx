import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryScreen } from "@/components/pages/video/library-screen";
import { getAssociationOptions } from "@/lib/video/association-options";
import { apiQuery, readLibraryQuery, readVideoParam } from "@/lib/video/library-query";
import { loadActiveLiveStream, loadThumbnails, loadVideoLibrary } from "@/lib/video/load";
import { libraryGraph } from "@/lib/video/structured-data";
import { isIndexable } from "@/lib/pages/indexability";
import { findPublicPage } from "@/lib/pages/public-pages";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildMetadata, SITE_ORIGIN } from "@/lib/seo/metadata";
import type { AppLocale } from "@/i18n/routing";
import { withheldPage } from "@/components/pages/page-inactive-screen";

/**
 * The video library.
 *
 * -- Chapter 14 §11, now satisfied -----------------------------------------
 *
 * This page shipped `noindex` because it had no list: `videos` exposed no
 * public endpoint, so it was a hero and nothing else, which is exactly §11's
 * "MAY exist internally ... but SHOULD remain temporarily `noindex` until the
 * required content is complete." It has a list now. The flag moved with it,
 * and it moved in `lib/pages/indexability.ts` rather than here, so this page's
 * robots directive and its presence in the sitemap (§13) still come from one
 * function and cannot disagree.
 *
 * -- Rendered per request ---------------------------------------------------
 *
 * Because a broadcast starts and ends without a deploy, and because the whole
 * view is in the query string. The reads underneath are still cached for
 * `PUBLIC_REVALIDATE_SECONDS`, which is what keeps the 60-second budget.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";

const KEY = "videos";

/** A page of the grid. "Show more" raises `page`, and the server returns
 *  everything up to it -- so the address describes the whole view rather than
 *  one slice of it, and a shared link shows what the sharer was looking at. */
const PAGE_SIZE = 12;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VideoSystem" });

  return buildMetadata({
    locale,
    route: "/media/videos",
    title: t("libraryMetaTitle"),
    description: t("libraryMetaDescription"),
    indexable: await isIndexable(findPublicPage(KEY)!),
  });
};

const VideosPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Switched off by the federation: the address stays, the content does not
  // (ADR-0102 §D2).
  const withheld = await withheldPage(KEY, locale);
  if (withheld) return withheld;

  const search = await searchParams;
  const query = readLibraryQuery(search);
  // Shape-checked here; whether it names a video that is actually in the list
  // is the screen's question, and an id that is not simply opens no player.
  const openVideoId = readVideoParam(search);

  // Everything up to the requested depth, because "show more" appends rather
  // than paging: asking for page 3 of 12 would drop the 24 rows the reader is
  // still looking at. `loadVideoLibrary` turns that into one read, or into as
  // many as the API's 48-row ceiling requires.
  const [page, live, associations] = await Promise.all([
    loadVideoLibrary((at, limit) => apiQuery({ ...query, page: at }, limit), PAGE_SIZE * query.page),
    loadActiveLiveStream(),
    getAssociationOptions(),
  ]);

  const items = page.items;
  // The broadcast carries a `thumbnailId` like any video, so it joins the one
  // media read the page already makes rather than adding a second.
  const thumbnails = await loadThumbnails(live ? [...items, live] : items);

  // The server split the shelves, so the screen does not filter twice. A reel
  // is never drawn in the landscape grid, at any width, on any tab.
  const reels = items.filter((item) => item.kind === "reel");
  const videos = items.filter((item) => item.kind === "video");

  // Only the seasons this library actually holds. An offered season with no
  // videos in it is a filter that leads to the empty state.
  const seasons = [...new Set(items.map((item) => item.season).filter((season): season is string => Boolean(season)))].sort().reverse();

  const graph = libraryGraph(items, thumbnails, live, locale, SITE_ORIGIN);

  return (
    <>
      {/* Through the site's one JSON-LD component, which escapes `<` so a
          title can never close the script tag. Nothing is emitted for a page
          with nothing to describe -- Chapter 14 §4 forbids structured data
          about content the page does not show. */}
      {graph["@graph"].length > 0 ? <JsonLd data={graph} /> : null}

      <LibraryScreen
        query={query}
        videos={videos}
        reels={reels}
        total={page.total}
        live={live}
        thumbnails={thumbnails}
        seasons={seasons}
        associations={associations}
        locale={locale}
        pageSize={PAGE_SIZE}
        openVideoId={openVideoId}
      />
    </>
  );
};

export default VideosPage;
