import type { Metadata } from "next";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The album pages' share picture.
 *
 * Platforms want 1200×630 and a photograph is stored at whatever ratio it was
 * taken at, so each platform would crop the raw file its own way. The CDN
 * crops it once instead: `c_fill` to the exact box, `g_auto` so the crop keeps
 * the subject rather than the centre, and `f_jpg` rather than `f_auto` —
 * `f_auto` answers by the requester's `Accept` header, and a crawler that
 * accepts WebP may hand it to a client that does not.
 *
 * No generated image route, unlike the news article's: an album always has a
 * photograph to share, and one that has none shares the site's default card
 * rather than a placeholder drawn for it.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

const UPLOAD = "/image/upload/";
/** An existing transformation segment, replaced rather than stacked: the CDN
 *  reads a second segment as part of the public id and answers 404. The same
 *  test `cloudinary-loader.ts` applies. */
const TRANSFORMATION = /^[a-z]{1,3}_[^/]*$/;

/** The CDN address of the photo cropped to the share size, or `null` for a
 *  file the CDN cannot transform — its size would be a claim nobody checked. */
export const ogImageUrl = (url: string): string | null => {
  if (!isCloudinaryUrl(url)) return null;
  const cut = url.indexOf(UPLOAD);
  if (cut === -1) return null;

  const head = url.slice(0, cut + UPLOAD.length);
  const segments = url.slice(cut + UPLOAD.length).split("/");
  const rest = TRANSFORMATION.test(segments[0]) ? segments.slice(1) : segments;
  return `${head}c_fill,g_auto,w_${OG_SIZE.width},h_${OG_SIZE.height},f_jpg,q_auto/${rest.join("/")}`;
};

/**
 * `buildMetadata`'s result with the share picture added.
 *
 * Added after the builder rather than inside it, because canonical and
 * hreflang are the builder's job on every page and the picture is these
 * pages' own. A photo that cannot be cropped adds nothing, and the page keeps
 * the layout's default card.
 */
export const withShareImage = (
  metadata: Metadata,
  photo: MediaAssetPublic | undefined,
  locale: AppLocale,
): Metadata => {
  const url = photo ? ogImageUrl(photo.file.url) : null;
  if (!photo || !url) return metadata;

  const alt = photo.altText[locale] ?? "";
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [{ url, ...OG_SIZE, alt }] },
    twitter: { ...metadata.twitter, images: [{ url, alt }] },
  };
};
