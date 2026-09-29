import type { LocalizedText } from "@/lib/api/types";

/**
 * The season vocabulary the public site reads, mirrored from the API's
 * `SeasonPublicResponse` (`api/src/modules/media-center/seasons/seasons.service.ts`).
 * Dates arrive as ISO strings: each is Dubai midnight of the calendar day it
 * names, and every one of them is inclusive (`season-days.ts`).
 */

export const SEASON_PHASE_TYPES = ["preparation", "domestic", "international", "rest"] as const;
export type SeasonPhaseType = (typeof SEASON_PHASE_TYPES)[number];

export interface SeasonPhase {
  name: LocalizedText;
  type: SeasonPhaseType;
  from: string;
  to: string;
}

export interface SeasonKeyDate {
  title: LocalizedText;
  date: string;
}

/** `PageSeoSchema`, as every public read that embeds it returns it. */
export interface SeasonSeo {
  metaTitle?: LocalizedText | null;
  metaDescription?: LocalizedText | null;
  ogImageId?: string | null;
}

/** One season as `GET /seasons/public`, `/public/current` and `/public/:slug` answer it. */
export interface SeasonPublic {
  id: string;
  name: LocalizedText;
  shortName: string;
  slug: string;
  tagline: LocalizedText | null;
  logoId: string | null;
  bannerId: string | null;
  shareImageId: string | null;
  about: LocalizedText;
  /** Already `null` from the API until the season's end has passed. */
  closingSummary: LocalizedText | null;
  startDate: string;
  endDate: string;
  phases: SeasonPhase[];
  keyDates: SeasonKeyDate[];
  calendarDocumentId: string | null;
  documentIds: string[];
  isCurrent: boolean;
  seo: SeasonSeo | null;
}
