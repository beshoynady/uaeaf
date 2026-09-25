import Image from "next/image";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { ReactNode } from "react";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * A page record's hero photograph, as the node `PageHero`'s `media` slot takes.
 *
 * ── Why the kit needs an adapter at all ────────────────────────────────────
 *
 * `@uaeaf/brand-ui` takes `media` as a `ReactNode` rather than a URL, and that
 * is deliberate: the package has no dependency beyond React, so it cannot reach
 * `next/image`, the Cloudinary loader, or `MediaAssetPublic`. Everything that
 * knows where a file came from lives on this side of the line, and this is the
 * one place it is written — the alternative is the same twelve lines in each of
 * the twelve screens that open with a hero.
 *
 * ── Why a plain `<img>` for a Cloudinary asset ─────────────────────────────
 *
 * The resizing is the CDN's, and `next/image` can only be told that through a
 * `loader` function, which a Server Component may not hand to the Client
 * Component it renders. A `srcSet` is a string, which may cross that line.
 * Anything not on the CDN goes through `next/image` as normal.
 *
 * `fetchPriority="high"` and `priority`: this is the largest contentful paint on
 * every page that has one, and it is the element the entrance was designed
 * around — opaque in its first frame, only its scale moving (`page-hero.css`).
 *
 * No `loading="lazy"` and no `decoding="async"`: a hero is above the fold by
 * definition, and both of those let the browser paint a frame without it. On the
 * one image that *is* the largest contentful paint, each is a regression rather
 * than a saving. It is also what the other two heroes on this site do, so the
 * three agree.
 */
const HeroPhoto = ({
  image,
  locale,
}: {
  image: MediaAssetPublic;
  locale: AppLocale;
}) =>
  isCloudinaryUrl(image.file.url) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.file.url}
      srcSet={cloudinarySrcSet(image.file.url, image.file.width)}
      sizes="100vw"
      alt={altOf(image, locale)}
      fetchPriority="high"
    />
  ) : (
    <Image
      src={image.file.url}
      alt={altOf(image, locale)}
      fill
      priority
      unoptimized={isExternalMedia(image.file.url)}
      sizes="100vw"
    />
  );

/**
 * The slot's value for a record that may or may not have a picture.
 *
 * `undefined` rather than `null` is what `PageHero` reads as "no photograph",
 * and returning it here keeps every caller to one line: the composition follows
 * the record, and no screen carries a conditional for it.
 */
export const heroPhotoSlot = (
  image: MediaAssetPublic | undefined,
  locale: AppLocale,
): ReactNode | undefined =>
  image === undefined ? undefined : <HeroPhoto image={image} locale={locale} />;
