import type { LocalizedText } from "@/lib/api/types";
import { editorialDraft, type PageSeo, type SeoDraft, type ValueBlock } from "@/lib/admin/editorial-draft";

/**
 * The Vision & Mission page as its screen edits it (ADR-0070). The draft's
 * two shapes and its save body come from `editorialDraft`; this file names
 * the fields and their kinds.
 */

export interface VisionMissionResponse {
  _id: string;
  heroImageId: string | null;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  visionTitle: LocalizedText | null;
  visionText: LocalizedText;
  visionImageId: string | null;
  missionTitle: LocalizedText | null;
  missionText: LocalizedText;
  missionImageId: string | null;
  goalsTitle: LocalizedText | null;
  strategicGoals: ValueBlock[];
  coreValues: ValueBlock[];
  valuesImageId: string | null;
  ctaImageId: string | null;
  seo: PageSeo | null;
  publicationState: string;
  /** Read only to order the collection when the URL names no record. */
  createdAt: string;
  updatedAt: string;
}

export interface VisionMissionDraft {
  heroImageId: string;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  visionTitle: LocalizedText;
  visionText: LocalizedText;
  visionImageId: string;
  missionTitle: LocalizedText;
  missionText: LocalizedText;
  missionImageId: string;
  goalsTitle: LocalizedText;
  strategicGoals: ValueBlock[];
  coreValues: ValueBlock[];
  valuesImageId: string;
  ctaImageId: string;
  seo: SeoDraft;
}

/** `federationId`, `publicationState` and `revisionId` are not fields of the
 *  draft, so they are never sent. The three one-line titles are the optional
 *  texts; the two statements are required upstream. */
export const { toDraft, changedFrom, toPatchBody } = editorialDraft<VisionMissionResponse, VisionMissionDraft>({
  heroImageId: "image",
  heroTitle: "text",
  heroSubtitle: "text",
  visionTitle: "optionalText",
  visionText: "text",
  visionImageId: "image",
  missionTitle: "optionalText",
  missionText: "text",
  missionImageId: "image",
  goalsTitle: "optionalText",
  strategicGoals: "blocks",
  coreValues: "blocks",
  valuesImageId: "image",
  ctaImageId: "image",
  seo: "seo",
});
