import { fetchPublic } from "./public-client";
import type { AppLocale } from "@/i18n/routing";
import type { MediaAssetPublic } from "./types";

/**
 * Resolves `mediaAssets` references to renderable images.
 *
 * The CMS stores ids, not URLs. `GET /media-assets/public?ids=…` is the only
 * unauthenticated read of the media library; it batches on purpose, because a
 * page referencing a hero and a map would otherwise cost two round trips
 * before first paint.
 *
 * Ids that resolve to nothing — deleted, hidden, or archived since an editor
 * saved the reference — are simply absent from the returned map. Callers must
 * render without the image rather than fail: a stale reference is an ordinary
 * editorial state, not a page error.
 */
export async function fetchPublicMedia(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, MediaAssetPublic>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();

  const assets = await fetchPublic<MediaAssetPublic[]>(
    `/media-assets/public?ids=${wanted.map(encodeURIComponent).join(",")}`,
  );

  return new Map((assets ?? []).map((asset) => [asset.id, asset]));
}

/** True when the CMS gave an absolute URL rather than a path this app serves.
 *
 *  `mediaAssets.file.url` is a string an editor supplies — there is no upload
 *  pipeline behind it — so its origin is not known at build time. Next's image
 *  optimizer refuses any host absent from `images.remotePatterns`, and an
 *  allowlist cannot be written for an origin nobody has chosen yet. Passing
 *  `unoptimized` for these skips the loader entirely and emits the src as
 *  given; internal paths still go through the optimizer as usual. */
export function isExternalMedia(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:|^\/\//i.test(url);
}

/** The asset's alt text in the reading language, or `""` for decoration.
 *
 *  An empty string is the correct value for an image that carries no meaning
 *  the surrounding text does not already give (WCAG 1.1.1) — dropping the
 *  attribute instead would make a screen reader announce the file name. */
export function altOf(asset: MediaAssetPublic | undefined, locale: AppLocale): string {
  return asset?.altText?.[locale] ?? "";
}
