import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";

/**
 * What the album viewer mounts, and at what size it asks the CDN for it.
 *
 * Kept out of the components so the two things that decide the page's weight
 * — how many slides exist, and which of them is fetched at stage size, at
 * what width for which screen — are plain functions with tests, not
 * conditions spread through JSX where a refactor can widen them without anyone
 * noticing.
 */

/** One photo as the viewer draws it: already resolved to the reader's
 *  language, because the viewer has no business knowing the record's shape. */
export interface ViewerPhoto {
  id: string;
  /** The stored delivery URL. Resized here, never by the caller. */
  src: string;
  /** Stored pixel size. Drives `aspect-ratio`, so the box is reserved before
   *  the bytes arrive (CLS 0). */
  width: number;
  height: number;
  alt: string;
  caption?: string | null;
  /** The photographer. The credit line exists only when this does. */
  credit?: string | null;
  /** The issuing body, appended to the credit when present. */
  source?: string | null;
}

/** Slides mounted on each side of the current one. A reader moving one step at
 *  a time never reaches the edge of the window, and an album of 400 photos
 *  costs the same DOM as one of 17. */
export const RENDER_RADIUS = 8;

/** Slides on each side of the current one fetched at once rather than when
 *  they near the screen. Two, so the next and previous two are already painted
 *  when the track slides them in. */
export const EAGER_RADIUS = 2;

/**
 * Cloudinary widths, each a box `viewer.css` draws, at 2x:
 *
 * - `stage` — the 820px desktop stage (1640);
 * - `stageCompact` — the 300px phone stage (600), rounded up to 640 so the
 *   narrowest phones' `min(300px, 100vw - 32px)` box is covered too;
 * - `soft` — a side slide, which stands under the 60% ink veil
 *   (`--opacity-overlay`) at 0.86 scale and is never looked at closely, and an
 *   index cell (~160px on desktop);
 * - `thumb` — the 96px filmstrip cell.
 */
export const CDN_WIDTH = { stage: 1640, stageCompact: 640, soft: 480, thumb: 192 } as const;

/**
 * The current slide's `sizes`: the slide box `viewer.css` declares, 820px from
 * `lg` (1024px) and the 300px phone box below it. The browser multiplies it by
 * the screen's density and picks the first candidate that covers the result.
 */
export const STAGE_SIZES = "(min-width: 1024px) 820px, 300px";

/** The current slide's two candidates, smallest first. Not the shared ladder
 *  in `cloudinary-srcset.ts`: the stage has exactly two boxes, so two files
 *  cover every screen, and 1640 is not on that ladder. */
const STAGE_CANDIDATES = [CDN_WIDTH.stageCompact, CDN_WIDTH.stage] as const;

/** What one slide's `<img>` asks for. */
export interface SlideImage {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/**
 * The photo in front offers both stage widths and lets the browser choose for
 * its box and its screen; every side slide is one soft file.
 *
 * A URL on any other host is left as stored, with no `srcset`: two widths of a
 * file nobody can resize would offer a choice that does not exist.
 */
export const slideImage = (src: string, isCurrent: boolean): SlideImage => {
  if (!isCurrent) return { src: cloudinaryLoader({ src, width: CDN_WIDTH.soft }) };
  if (!isCloudinaryUrl(src)) return { src };
  return {
    // What a browser without `srcset` fetches: the desktop file, which is
    // sharp everywhere.
    src: cloudinaryLoader({ src, width: CDN_WIDTH.stage }),
    srcSet: STAGE_CANDIDATES.map((width) => `${cloudinaryLoader({ src, width })} ${width}w`).join(", "),
    sizes: STAGE_SIZES,
  };
};

/** How many cells of the index grid stagger their reveal. The first thirty
 *  take steps 0 to 29; every later cell appears with the thirtieth, so the end
 *  of a long album does not wait seconds to appear. At `viewer.css`'s 20ms a
 *  step the thirtieth cell starts at 29 x 20ms = 580ms, inside Chapter 5
 *  §5.7's 600ms total-stagger ceiling. */
export const REVEAL_CAP = 30;

export const clampIndex = (index: number, count: number): number =>
  count <= 0 ? 0 : Math.min(Math.max(index, 0), count - 1);

/** The indices to mount, in order: the current photo and up to `radius` on
 *  each side, clipped at the album's ends. */
export const renderWindow = (current: number, count: number, radius: number = RENDER_RADIUS): number[] => {
  if (count <= 0) return [];
  const start = Math.max(0, current - radius);
  const end = Math.min(count - 1, current + radius);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
};

export const thumbImageSrc = (src: string): string => cloudinaryLoader({ src, width: CDN_WIDTH.thumb });

/** An index cell is ~160px wide on desktop, so `thumb` would be soft on a 2x
 *  screen; `soft` is the smallest width that is not. */
export const gridImageSrc = (src: string): string => cloudinaryLoader({ src, width: CDN_WIDTH.soft });

/**
 * +1 for "next photo", -1 for "previous", 0 for a key that is not an arrow.
 *
 * Forward is the reading direction: right in English, left in Arabic. The
 * caller passes the DOCUMENT's direction — an element's own `dir` property
 * reads `""` in this codebase, because only `<html>` carries the attribute.
 */
export const arrowStep = (key: string, direction: "rtl" | "ltr"): -1 | 0 | 1 => {
  const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
  const backward = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
  if (key === forward) return 1;
  if (key === backward) return -1;
  return 0;
};

/** "07" of 48, "007" of 120: every ordinal as wide as the total, and never
 *  narrower than two digits, so the counter does not change width as it runs. */
export const padOrdinal = (value: number, total: number): string =>
  String(value).padStart(Math.max(2, String(total).length), "0");

export const indexOfPhoto = (photos: readonly { id: string }[], id: string | null | undefined): number =>
  id ? photos.findIndex((photo) => photo.id === id) : -1;

/** The reveal step of the cell at `index`: its own position for the first
 *  `REVEAL_CAP` cells, the last of those for every cell after them. */
export const revealStep = (index: number): number => Math.min(index, REVEAL_CAP - 1);

/** True when the render window reaches past the photos loaded so far and the
 *  album has more: the next page must arrive before the reader gets there. */
export const shouldRequestMore = (current: number, loaded: number, total: number): boolean =>
  loaded < total && current + RENDER_RADIUS >= loaded;

/**
 * The page's address with `?photo=<id>` set, every other parameter and the
 * hash kept. The viewer writes it with `replaceState`, never `pushState`: one
 * album browsed photo by photo must not fill the reader's back button.
 */
export const withPhotoParam = (href: string, id: string): string => {
  const url = new URL(href);
  url.searchParams.set("photo", id);
  return url.toString();
};
