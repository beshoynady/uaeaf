"use server";

import { routing, type AppLocale } from "@/i18n/routing";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import { loadAlbumDetail, toViewerPhoto } from "./load";

/**
 * The viewer's next page of photos, read on the server.
 *
 * A Server Action rather than a fetch from the browser, because the API's
 * address (`UAEAF_API_URL`) is server configuration and the public client is
 * built never to carry it to the reader. The same cached read the page makes,
 * so a page read here and one read by a render share the cache.
 *
 * Every argument arrives from the browser, so each is checked: a locale
 * outside the two, or an offset that is not a non-negative integer, answers
 * nothing rather than being passed on.
 */
export const readAlbumPhotos = async (
  slug: string,
  skip: number,
  locale: AppLocale,
): Promise<{ photos: ViewerPhoto[]; total: number } | null> => {
  if (typeof slug !== "string" || slug.length === 0) return null;
  if (!Number.isInteger(skip) || skip < 0) return null;
  if (!(routing.locales as readonly string[]).includes(locale)) return null;

  const detail = await loadAlbumDetail(slug, skip);
  if (!detail) return null;

  return {
    photos: detail.mediaAssets.map((asset) => toViewerPhoto(asset, locale)),
    total: detail.photoTotal,
  };
};
