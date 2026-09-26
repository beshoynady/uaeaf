/**
 * The homepage photo-gallery section's settings, as its editor holds them.
 *
 * Stored in the configuration of the `PHOTO_GALLERY` row that
 * `bootstrap:admin` seeds (`api/src/bootstrap/seed-photo-gallery-section.ts`):
 * `{ eyebrow, enabled, mode, count, albumIds }`. The heading and the line under
 * it are the row's own `sectionTitle`/`sectionSubtitle`, as on every section.
 *
 * Nothing read here is trusted. `configuration` is `Mixed`, so a half-saved
 * draft or a key from an older shape can be in it, and the screen must open
 * regardless: a value that cannot be used falls back to its default.
 */

/** Three to eight, as the section's brief sets it. Fewer than three is not a
 *  gallery; more than eight is two rows on the widest screen. */
export const GALLERY_COUNTS = [3, 4, 5, 6, 7, 8] as const;

/** The seed's own default: the homepage row is four cards wide. */
export const DEFAULT_GALLERY_COUNT = 4;

export const MAX_MANUAL_ALBUMS = GALLERY_COUNTS[GALLERY_COUNTS.length - 1];

export type GalleryMode = "latest" | "manual";

export interface GallerySectionDraft {
  enabled: boolean;
  eyebrow: { ar: string; en: string };
  heading: { ar: string; en: string };
  description: { ar: string; en: string };
  mode: GalleryMode;
  count: number;
  /** In the order the homepage draws them. */
  albumIds: string[];
}

const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const bilingual = (value: unknown) => {
  const pair = object(value);
  return { ar: text(pair.ar), en: text(pair.en) };
};

const isId = (value: unknown): value is string => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export const readGallerySectionDraft = (configuration: unknown, section?: Record<string, unknown>): GallerySectionDraft => {
  const config = object(configuration);
  const row = object(section);

  return {
    // Off if either says off. The rail's switch writes the row and this
    // screen writes both, so the two only disagree if something else wrote
    // one of them — and then "hidden" is the safer reading of the pair.
    enabled: row.enabled !== false && config.enabled !== false,
    eyebrow: bilingual(config.eyebrow),
    heading: bilingual(row.sectionTitle),
    description: bilingual(row.sectionSubtitle),
    mode: config.mode === "manual" ? "manual" : "latest",
    count: (GALLERY_COUNTS as readonly unknown[]).includes(config.count) ? (config.count as number) : DEFAULT_GALLERY_COUNT,
    // Duplicates dropped: the same album twice is one card drawn twice.
    albumIds: Array.isArray(config.albumIds) ? [...new Set(config.albumIds.filter(isId))].slice(0, MAX_MANUAL_ALBUMS) : [],
  };
};

/**
 * Back into the stored shape. `albumIds` is kept even in `latest` mode, so an
 * editor who switches to latest for a week and back finds their picks where
 * they left them.
 */
export const toGalleryConfiguration = (draft: GallerySectionDraft): Record<string, unknown> => ({
  eyebrow: draft.eyebrow,
  enabled: draft.enabled,
  mode: draft.mode,
  count: draft.count,
  albumIds: draft.albumIds,
});

/** One album moved one place in the manual order; `null` when it cannot move. */
export const moveAlbum = (ids: readonly string[], id: string, delta: -1 | 1): string[] | null => {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};
