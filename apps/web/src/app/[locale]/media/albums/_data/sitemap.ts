import type { MetadataRoute } from "next";
import { fetchPublic } from "@/lib/api/public-client";
import type { AlbumListResponse } from "@/lib/albums/album-types";
import { absoluteUrl } from "@/lib/seo/metadata";
import { routing } from "@/i18n/routing";

/**
 * Every published album's address, in both languages, for the sitemap
 * (Chapter 14 §13).
 *
 * Written here and not yet mounted: the site's sitemap files live in `app/`,
 * outside the album route, and adding a call to one of them is that file's
 * change. The list endpoint answers only published albums, so a draft cannot
 * reach a sitemap through this; `lastModified` is the publication date, never
 * `now`, which would tell a crawler every album changed on every crawl.
 */

/** The list endpoint's ceiling (`AlbumListQueryDto`, `@Max(48)`). */
const PAGE = 48;

export const albumSitemapEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const first = await fetchPublic<AlbumListResponse>(
    `/albums/public?page=1&limit=${PAGE}`,
    ["albums"],
  );
  if (!first) return [];

  const rest = await Promise.all(
    Array.from(
      { length: Math.max(0, Math.ceil(first.total / PAGE) - 1) },
      (_, index) =>
        fetchPublic<AlbumListResponse>(
          `/albums/public?page=${index + 2}&limit=${PAGE}`,
          ["albums"],
        ),
    ),
  );

  return [first, ...rest]
    .flatMap((page) => page?.items ?? [])
    .flatMap((album) => {
      const route = `/media/albums/${album.slug}`;
      return routing.locales.map((locale) => ({
        url: absoluteUrl(locale, route),
        ...(album.publishedAt
          ? { lastModified: new Date(album.publishedAt) }
          : {}),
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((other) => [other, absoluteUrl(other, route)]),
          ),
        },
      }));
    });
};
