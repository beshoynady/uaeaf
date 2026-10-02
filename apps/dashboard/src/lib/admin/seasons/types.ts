import type { LocalizedText } from "@/lib/api/types";

/**
 * The season vocabulary, mirrored from the API's own closed lists
 * (`api/src/modules/media-center/seasons/schemas/season.schema.ts`).
 *
 * Restated rather than imported for the reason `albums/types.ts` gives: the
 * dashboard reaches the API over HTTP, and importing across that boundary
 * would turn a runtime contract into a build-time dependency. The API's own
 * `@IsIn` refuses anything outside these with a 400.
 */
/** The platform's publication vocabulary. `Unpublished` is not `Draft`: the
 *  season has been live and was taken down. */
export const SEASON_STATES = ["Draft", "Live", "Unpublished", "Archived"] as const;
export type SeasonState = (typeof SEASON_STATES)[number];

/** What `POST /seasons` accepts. `Live` is reachable only through the publish
 *  routes, which run the type's approval policy. */
export const CREATABLE_SEASON_STATES = ["Draft", "Unpublished", "Archived"] as const satisfies readonly SeasonState[];

export const SEASON_PHASE_TYPES = ["preparation", "domestic", "international", "rest"] as const;
export type SeasonPhaseType = (typeof SEASON_PHASE_TYPES)[number];

export interface SeasonPhase {
  name: LocalizedText;
  type: SeasonPhaseType;
  /** ISO instants, stored UTC. */
  from: string;
  to: string;
}

export interface SeasonKeyDate {
  title: LocalizedText;
  date: string;
}

export interface SeasonSeo {
  metaTitle: LocalizedText | null;
  metaDescription: LocalizedText | null;
  ogImageId: string | null;
}

/** A season as the admin screens read it. */
export interface AdminSeason {
  id: string;
  name: LocalizedText;
  shortName: string;
  slug: string;
  tagline: LocalizedText | null;
  logoId: string | null;
  bannerId: string | null;
  shareImageId: string | null;
  about: LocalizedText;
  closingSummary: LocalizedText | null;
  startDate: string;
  endDate: string;
  phases: SeasonPhase[];
  keyDates: SeasonKeyDate[];
  calendarDocumentId: string | null;
  documentIds: string[];
  isCurrent: boolean;
  publicationState: SeasonState;
  /** When the season last went live. */
  publishDate: string | null;
  isVisible: boolean;
  seo: SeasonSeo;
  /** The version the editor is looking at. `PATCH :id/publish` refuses a
   *  record that changed after this, so publishing sends it back. */
  updatedAt: string | null;
}

/**
 * Which publishing door the season type's approval policy leaves open
 * (ADR-0125).
 *
 * - `direct`: a policy row with `workflowRequired: false`, or no row at all,
 *   which the API treats as publish-by-permission.
 * - `approval`: the policy requires a review.
 * - `unknown`: the reader may not read policies. The API still decides; the
 *   screen offers "publish" and reports the API's refusal if it comes.
 */
export type PublishMode = "direct" | "approval" | "unknown";

/** What each season still holds, counted the way the API's delete guard
 *  counts it. `null` where the reader may not read that library. */
export interface SeasonContent {
  albums: number | null;
  videos: number | null;
}
