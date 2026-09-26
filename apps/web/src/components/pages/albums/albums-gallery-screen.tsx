import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  BRAND_CONTAINER,
  Button,
  EmptyState,
  SectionHeading,
  Surface,
} from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { breadcrumbTrail } from "@/components/pages/static-page-screen";
import { AlbumCard } from "@/components/shared/albums/album-card";
import { AlbumFilterBar } from "@/components/shared/albums/album-filter-bar";
import type { DeckCover } from "@/components/shared/albums/types";
import { albumAffiliations } from "@/lib/albums/affiliations";
import {
  EMPTY_ALBUM_QUERY,
  albumSearchParams,
  albumsHref,
  hasActiveAlbumFilter,
} from "@/lib/albums/album-query";
import type { AlbumQuery } from "@/lib/albums/album-query";
import type {
  AlbumFacetNames,
  AlbumFacets,
  AlbumListItem,
  AlbumStats,
} from "@/lib/albums/album-types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { AlbumsGalleryJsonLd } from "./album-json-ld";
import { AlbumsHero } from "./albums-hero";
import { AlbumsPagination } from "./albums-pagination";
import { FeaturedAlbum } from "./featured-album";

/**
 * The photo gallery's composition, below its route (which reads the address
 * and fetches). Approved canvases `albums-main.png` and `albums-mobile-1/2.png`.
 *
 * -- Order ---------------------------------------------------------------------
 *
 * Hero with the archive's figures; the featured album laid over the hero's
 * foot; the section heading; the filter bar; the grid; the pager on desktop
 * and "show more" below it.
 *
 * -- The filter bar and the grid are siblings ----------------------------------
 *
 * From `lg` the bar is `position: sticky`, and a sticky element sticks within
 * its parent. So it is a direct child of the column the grid is in — wrapped
 * in anything of its own, it would have nothing to stick within.
 *
 * -- Paging: two widths, two controls, one address ------------------------------
 *
 * Desktop pages (`?page=`) and the phone appends (`?more=`, a count of pages
 * stacked under the current one). Both are addresses, so the view survives a
 * reload and a shared link, and both are links, so they work before any
 * JavaScript arrives. A filter change drops both — the bar writes its address
 * through `albumsHref`, which knows neither — because a narrower list is a new
 * list, read from its start.
 *
 * -- Nothing to show ------------------------------------------------------------
 *
 * Three different "empty"s, told apart because each has a different next step:
 * an archive with nothing published (nothing to do but come back), a filter
 * that matches nothing (widen it — the empty state says how, and clears it in
 * one press), and a page number past the archive's end (go to its first page).
 * An archive with nothing published also draws no filter bar: narrowing an
 * empty list is a control that cannot do anything.
 */

const PATH = "/media/albums";

export const AlbumsGalleryScreen = ({
  locale,
  title,
  subtitle,
  heroImage,
  stats,
  featured,
  albums,
  total,
  facets,
  names,
  query,
  more,
  pageSize,
  maxMore,
}: {
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  heroImage: MediaAssetPublic | undefined;
  stats: AlbumStats | null;
  featured: { album: AlbumListItem; covers: readonly DeckCover[] } | null;
  /** The albums on screen: `query.page`, plus `more` pages after it. */
  albums: readonly AlbumListItem[];
  /** Albums matching the query, across every page. */
  total: number;
  facets: AlbumFacets;
  names: AlbumFacetNames;
  query: AlbumQuery;
  more: number;
  pageSize: number;
  /** The most pages "show more" may stack before it moves on instead. */
  maxMore: number;
}) => {
  const t = useTranslations("albums.page");
  const tPages = useTranslations("Pages");
  const tNav = useTranslations("Nav");
  const headingId = useId();

  const page = findPublicPage("albums")!;
  const trail = breadcrumbTrail(
    page,
    (key) => tPages(key),
    (key) => tNav(key),
  ).filter(
    (crumb): crumb is { name: string; route: string } => crumb.route !== null,
  );

  const filtered = hasActiveAlbumFilter(query);
  const pages = Math.ceil(total / pageSize);
  const shownEnd = (query.page - 1) * pageSize + albums.length;
  const hasMore = albums.length > 0 && shownEnd < total;

  // Appending while there is room under the cap; past it, the button moves to
  // the next unread page instead, so a phone reader is never stranded.
  const moreParams = albumSearchParams(
    more < maxMore ? query : { ...query, page: query.page + more + 1 },
  );
  if (more < maxMore) moreParams.set("more", String(more + 1));
  const moreHref = `${PATH}?${moreParams}`;

  return (
    <>
      <AlbumsGalleryJsonLd
        locale={locale}
        route={page.route}
        name={title}
        description={subtitle ?? title}
        albums={albums}
      />
      {trail.length > 0 ? (
        <BreadcrumbJsonLd locale={locale} trail={trail} />
      ) : null}
      <AlbumsHero
        locale={locale}
        title={title}
        subtitle={subtitle}
        heroImage={heroImage}
        stats={stats}
        overlapped={featured !== null}
      />
      {featured ? (
        // `relative`, so the card paints over the hero it overlaps rather
        // than under it.
        <div className={`${BRAND_CONTAINER} relative -mt-[110px]`}>
          <FeaturedAlbum
            album={featured.album}
            covers={featured.covers}
            locale={locale}
          />
        </div>
      ) : null}
      {/* `Surface` takes no ARIA attributes, so the named region wraps it. */}
      <section aria-labelledby={headingId}>
        <Surface kind="canvas" as="div" className="py-16">
          <div className={`${BRAND_CONTAINER} flex flex-col gap-8`}>
            <SectionHeading
              title={<span id={headingId}>{t("archive.title")}</span>}
              description={t("archive.description")}
            />

            {total > 0 || filtered ? (
              <AlbumFilterBar
                query={query}
                facets={facets}
                names={names}
                total={total}
                shown={albums.length}
              />
            ) : null}

            {albums.length > 0 ? (
              /* Chapter 5 as built (IA §12 [B]): one column under 640px, two
               from 640px, four from 1024px — the four-up the canvas draws. */
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {albums.map((album) => (
                  <li key={album.id} className="min-w-0">
                    <AlbumCard
                      album={album}
                      locale={locale}
                      affiliations={albumAffiliations(album, locale)}
                    />
                  </li>
                ))}
              </ul>
            ) : total > 0 ? (
              <EmptyState
                title={t("empty.pageTitle")}
                description={t("empty.pageBody")}
                action={
                  <Button
                    href={albumsHref(PATH, { ...query, page: 1 })}
                    linkComponent={Link}
                    variant="secondary"
                  >
                    {t("empty.firstPage")}
                  </Button>
                }
              />
            ) : filtered ? (
              <EmptyState
                title={t("empty.filteredTitle")}
                description={t("empty.filteredBody")}
                action={
                  <Button
                    href={albumsHref(PATH, EMPTY_ALBUM_QUERY)}
                    linkComponent={Link}
                    variant="secondary"
                  >
                    {t("empty.clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title={t("empty.archiveTitle")}
                description={t("empty.archiveBody")}
              />
            )}

            <AlbumsPagination
              query={query}
              pages={pages}
              className="max-lg:hidden"
            />

            {hasMore ? (
              <div className="flex justify-center lg:hidden">
                {/* The tricolour edge is the kit's secondary button, the
                  canvas's `btn-tri`. `scroll={false}`: the new rows land under
                  the reader's thumb rather than sending them back to the top. */}
                <Button
                  href={moreHref}
                  linkComponent={Link}
                  variant="secondary"
                  size="lg"
                  scroll={false}
                  className="w-full justify-center"
                >
                  {t("showMore")}
                </Button>
              </div>
            ) : null}
          </div>
        </Surface>
      </section>
    </>
  );
};
