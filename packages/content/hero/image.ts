/**
 * Which picture a hero slide shows, and where its crop holds, for a language
 * and a device. The site draws with it and the dashboard previews with it, so
 * the two cannot disagree about a crop (owner decision 2026-09-17, ADR-0083).
 *
 * The rules are ADR-0080 D1's:
 * - Arabic sees the composed landscape picture as stored.
 * - English sees `desktopLtr`, which the API has already resolved from
 *   `ltrImageMode`: the same picture flipped (with its focal point flipped), the
 *   same picture, or a separate one. Missing, English falls back to the
 *   composed picture, unflipped.
 * - A phone sees the portrait picture when the slide has one, in both languages
 *   and never flipped; otherwise the landscape picture for its language.
 * - The phone switch is at 640px, the `<source media>` the site uses.
 */

export interface PointLike {
  x: number;
  y: number;
}

export interface PublicImageLike {
  url: string;
  width: number;
  height: number;
  altText: { ar: string; en: string };
}

export interface HeroImageLike {
  image: PublicImageLike;
  focalPoint: PointLike;
}

export interface HeroSlideLike {
  desktop: HeroImageLike | null;
  desktopLtr: (HeroImageLike & { mirrored: boolean }) | null;
  mobile: HeroImageLike | null;
}

export type HeroDevice = "desktop" | "tablet" | "mobile";

/** The widest viewport that takes the portrait picture. */
export const HERO_MOBILE_MAX_WIDTH = 640;

export const heroDevice = (width: number): HeroDevice =>
  width <= HERO_MOBILE_MAX_WIDTH ? "mobile" : width < 1024 ? "tablet" : "desktop";

export interface ResolvedImage {
  image: PublicImageLike;
  /** Where the reader sees the subject: the camera's slow move goes there. */
  focalPoint: PointLike;
  mirrored: boolean;
  /** `object-position` for the `<img>`, in the picture's own coordinates. */
  objectPosition: string;
  /** `transform-origin` for the Ken Burns layer, where the subject is seen. */
  origin: string;
  source: "desktop" | "ltr" | "mobile";
}

const percent = (point: PointLike) => `${point.x}% ${point.y}%`;

/**
 * The crop anchor for a subject seen at `focalPoint`. A mirrored picture is
 * flipped after it is cropped, so its crop must hold the mirror image of where
 * the subject is seen.
 */
export const objectPosition = (focalPoint: PointLike, mirrored: boolean): string =>
  percent(mirrored ? { x: 100 - focalPoint.x, y: focalPoint.y } : focalPoint);

const resolved = (
  from: HeroImageLike,
  mirrored: boolean,
  source: ResolvedImage["source"],
): ResolvedImage => ({
  image: from.image,
  focalPoint: from.focalPoint,
  mirrored,
  objectPosition: objectPosition(from.focalPoint, mirrored),
  origin: percent(from.focalPoint),
  source,
});

export const resolveImage = (
  slide: HeroSlideLike,
  locale: "ar" | "en",
  device: HeroDevice,
): ResolvedImage | null => {
  if (!slide.desktop) return null;
  if (device === "mobile" && slide.mobile) return resolved(slide.mobile, false, "mobile");
  if (locale === "en" && slide.desktopLtr) {
    return resolved(slide.desktopLtr, slide.desktopLtr.mirrored, "ltr");
  }
  return resolved(slide.desktop, false, "desktop");
};
