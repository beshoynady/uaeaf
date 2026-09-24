import { Types } from 'mongoose';
import { VIDEO_CATEGORIES } from '../videos/schemas/video.schema.js';
import { seasonRange } from '../videos/season.js';
import { VIDEO_ASSOCIATION_TYPES } from '../videos/videos.public-filter.js';
import type { VideoCategory } from '../videos/schemas/video.schema.js';

/**
 * The VIDEO_LIBRARY section's settings, read out of `pageSections`'
 * free-form `configuration`.
 *
 * Nothing here trusts what it finds. `configuration` is `Mixed` — a
 * half-saved draft, a key from an older shape or a hand-edited document are
 * all things that can be in it — and this section renders on the homepage. A
 * malformed value therefore falls back to its default rather than throwing:
 * the worst outcome of a bad configuration should be the default section, not
 * a homepage that will not render.
 *
 * The one place that is *not* lenient is `count`. An unoffered number is not
 * clamped to the nearest offered one, because 7 is not a layout this design
 * has, and quietly drawing 6 would misreport what the editor saved.
 */

/** The counts the design lays out, and the default the dashboard opens on. */
export const CAROUSEL_COUNTS = [4, 6, 8, 10, 12] as const;
export const DEFAULT_CAROUSEL_COUNT = 8;

export type FeaturedMode = 'latest' | 'specific';
export type CarouselSource = 'latest' | 'filtered' | 'manual';

export interface VideoSectionSettings {
  featured: { mode: FeaturedMode; videoId: string | null };
  carousel: {
    source: CarouselSource;
    count: number;
    category: VideoCategory | null;
    season: string | null;
    association: string | null;
    manualIds: string[];
    /** Reels are vertical and the carousel is a horizontal row, so they are
     *  out unless an editor deliberately asks for them. */
    includeReels: boolean;
  };
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const isObjectId = (value: unknown): value is string =>
  typeof value === 'string' && Types.ObjectId.isValid(value);

const readFeatured = (value: unknown): VideoSectionSettings['featured'] => {
  const featured = record(value);
  const videoId = isObjectId(featured.videoId) ? featured.videoId : null;

  // "specific" with nothing chosen is a half-filled form, not a decision. The
  // homepage still needs a featured video, so it falls back to the newest.
  if (featured.mode === 'specific' && videoId) return { mode: 'specific', videoId };
  return { mode: 'latest', videoId: null };
};

const readAssociation = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const ownerType = value.slice(0, separator);
  const ownerId = value.slice(separator + 1);
  if (!(VIDEO_ASSOCIATION_TYPES as readonly string[]).includes(ownerType)) return null;
  return Types.ObjectId.isValid(ownerId) ? value : null;
};

const readCarousel = (value: unknown): VideoSectionSettings['carousel'] => {
  const carousel = record(value);
  const source = carousel.source;
  const count = carousel.count;
  const category = carousel.category;

  return {
    source: source === 'filtered' || source === 'manual' ? source : 'latest',
    count: (CAROUSEL_COUNTS as readonly unknown[]).includes(count) ? (count as number) : DEFAULT_CAROUSEL_COUNT,
    category: (VIDEO_CATEGORIES as readonly unknown[]).includes(category) ? (category as VideoCategory) : null,
    // Validated by the same reader the public filter uses, so a label the
    // filter would ignore is not stored here as though it worked.
    season: typeof carousel.season === 'string' && seasonRange(carousel.season) ? carousel.season : null,
    association: readAssociation(carousel.association),
    // Order preserved: the editor arranged these by hand, and this is the one
    // place in the system where a manual order means something.
    manualIds: Array.isArray(carousel.manualIds) ? carousel.manualIds.filter(isObjectId) : [],
    includeReels: carousel.includeReels === true,
  };
};

export const readVideoSectionSettings = (configuration: unknown): VideoSectionSettings => {
  const config = record(configuration);
  return { featured: readFeatured(config.featured), carousel: readCarousel(config.carousel) };
};
