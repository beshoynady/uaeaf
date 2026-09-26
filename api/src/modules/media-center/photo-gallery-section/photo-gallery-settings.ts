import { Types } from 'mongoose';

/**
 * The PHOTO_GALLERY section's settings, read out of `pageSections`'
 * free-form `configuration`.
 *
 * Nothing here trusts what it finds. `configuration` is `Mixed` — a
 * half-saved draft, a key from an older shape, or a hand-edited document are
 * all things that can be in it — and this section renders on the homepage. A
 * malformed value therefore falls back to its default rather than throwing:
 * the worst outcome of a bad configuration should be the default section, not
 * a homepage that will not render.
 *
 * The one place that is *not* lenient is `count`. An unoffered number is not
 * clamped to the nearest offered one, because 7 is not a layout this design
 * has, and quietly drawing 6 would misreport what the editor saved.
 *
 * Deliberately a near-copy of `video-section/video-settings.ts` rather than a
 * shared abstraction: the two sections agree on three keys today and on
 * nothing else, and a shared reader would have to grow a branch per section
 * the first time they diverge.
 */

/** The counts the design lays out, and the default the dashboard opens on. */
export const GALLERY_COUNTS = [3, 4, 5, 6, 7, 8] as const;
export const DEFAULT_GALLERY_COUNT = 4;

export type GalleryMode = 'latest' | 'manual';

export interface PhotoGallerySettings {
  /** False hides the section entirely — a heading over nothing is worse than
   *  an absent section. */
  enabled: boolean;
  mode: GalleryMode;
  count: number;
  /** Order preserved: the editor arranged these by hand, and this is the one
   *  place in the section where a manual order means something. */
  albumIds: string[];
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const isObjectId = (value: unknown): value is string =>
  typeof value === 'string' && Types.ObjectId.isValid(value);

export const readPhotoGallerySettings = (configuration: unknown): PhotoGallerySettings => {
  const config = record(configuration);
  const count = config.count;

  return {
    // Absent reads as on: a row that exists was created to be shown, and the
    // switch that turns it off writes `false` explicitly.
    enabled: config.enabled !== false,
    mode: config.mode === 'manual' ? 'manual' : 'latest',
    count: (GALLERY_COUNTS as readonly unknown[]).includes(count) ? (count as number) : DEFAULT_GALLERY_COUNT,
    albumIds: Array.isArray(config.albumIds) ? config.albumIds.filter(isObjectId) : [],
  };
};
