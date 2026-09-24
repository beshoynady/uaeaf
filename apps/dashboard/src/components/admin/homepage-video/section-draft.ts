import { VIDEO_CATEGORIES } from "@/lib/admin/videos/types";
import type { VideoCategory } from "@/lib/admin/videos/types";

/**
 * The video section's settings as the editor form holds them.
 *
 * Flat, because a form is flat: nesting the draft to match the stored shape
 * would mean every field's onChange rebuilt two objects. `toConfiguration`
 * puts it back into the nested shape `pageSections.configuration` stores.
 *
 * Nothing here trusts what it reads. `configuration` is `Mixed` — a half-saved
 * draft or a key from an older shape can be in it — and this screen must open
 * regardless. A value that cannot be used falls back to its default rather
 * than throwing.
 */
export const CAROUSEL_COUNTS = [4, 6, 8, 10, 12] as const;
export const DEFAULT_CAROUSEL_COUNT = 8;

export type FeaturedMode = "latest" | "specific";
export type CarouselSource = "latest" | "filtered" | "manual";

export interface SectionDraft {
  enabled: boolean;
  eyebrow: { ar: string; en: string };
  heading: { ar: string; en: string };
  description: { ar: string; en: string };
  featuredMode: FeaturedMode;
  featuredVideoId: string | null;
  carouselSource: CarouselSource;
  carouselCount: number;
  carouselCategory: VideoCategory | null;
  carouselAssociation: string | null;
  carouselHeading: { ar: string; en: string };
  manualIds: string[];
  includeReels: boolean;
}

const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const bilingual = (value: unknown) => {
  const pair = object(value);
  return { ar: text(pair.ar), en: text(pair.en) };
};

/** A 24-character hex id. Checked by shape only — the dashboard cannot ask
 *  whether a video still exists without a round trip, and the API drops an id
 *  that no longer resolves anyway. */
const isId = (value: unknown): value is string => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export const readSectionDraft = (configuration: unknown, section?: Record<string, unknown>): SectionDraft => {
  const config = object(configuration);
  const featured = object(config.featured);
  const carousel = object(config.carousel);
  const row = object(section);

  return {
    enabled: row.enabled !== false,
    eyebrow: bilingual(config.eyebrow),
    heading: bilingual(row.sectionTitle),
    description: bilingual(row.sectionSubtitle),
    featuredMode: featured.mode === "specific" && isId(featured.videoId) ? "specific" : "latest",
    featuredVideoId: isId(featured.videoId) ? featured.videoId : null,
    carouselSource:
      carousel.source === "filtered" || carousel.source === "manual" ? (carousel.source as CarouselSource) : "latest",
    carouselCount: (CAROUSEL_COUNTS as readonly unknown[]).includes(carousel.count)
      ? (carousel.count as number)
      : DEFAULT_CAROUSEL_COUNT,
    carouselCategory: (VIDEO_CATEGORIES as readonly unknown[]).includes(carousel.category)
      ? (carousel.category as VideoCategory)
      : null,
    carouselAssociation: typeof carousel.association === "string" ? carousel.association : null,
    carouselHeading: bilingual(carousel.heading),
    manualIds: Array.isArray(carousel.manualIds) ? carousel.manualIds.filter(isId) : [],
    includeReels: carousel.includeReels === true,
  };
};

/** Back into the nested shape the API reads. Only the keys that mean
 *  something are written: a `null` category stored explicitly would read as a
 *  deliberate "no category" rather than "not filtering by category". */
export const toConfiguration = (draft: SectionDraft): Record<string, unknown> => ({
  eyebrow: draft.eyebrow,
  featured: {
    mode: draft.featuredMode,
    ...(draft.featuredMode === "specific" && draft.featuredVideoId ? { videoId: draft.featuredVideoId } : {}),
  },
  carousel: {
    source: draft.carouselSource,
    count: draft.carouselCount,
    includeReels: draft.includeReels,
    heading: draft.carouselHeading,
    ...(draft.carouselCategory ? { category: draft.carouselCategory } : {}),
    ...(draft.carouselAssociation ? { association: draft.carouselAssociation } : {}),
    ...(draft.carouselSource === "manual" ? { manualIds: draft.manualIds } : {}),
  },
});
