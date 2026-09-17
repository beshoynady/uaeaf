import {
  STRIP_DEFAULTS,
  selectShowcase,
  stripItems,
  stripRowFrom,
  type StripBreakpoint,
  type StripSettingsLike,
  type SponsorshipTier,
} from "@uaeaf/content/sponsors";
import type { FieldError } from "./organizations";
import type { SponsorRecord, SponsorshipRecord } from "./sponsors";

/**
 * The global sponsor strip's settings screen model (ADR-0077 D5, ADR-0085 D7).
 *
 * One set of settings for the whole strip. The preview answers from the site's
 * own functions (`selectShowcase`, `stripItems`, `stripRowFrom`), so the pinned
 * sponsor, the order and the width from which the row stands still are the ones
 * the site will draw.
 */

export type StripDraft = Omit<StripSettingsLike, "sponsorshipIds"> & { sponsorshipIds: string[] };

export const fromStripRecord = (stored: Partial<StripSettingsLike> | null | undefined): StripDraft => ({
  isVisible: stored?.isVisible ?? STRIP_DEFAULTS.isVisible,
  displayMode: stored?.displayMode ?? STRIP_DEFAULTS.displayMode,
  selection: stored?.selection ?? STRIP_DEFAULTS.selection,
  sponsorshipIds: [...(stored?.sponsorshipIds ?? [])],
  order: stored?.order ?? STRIP_DEFAULTS.order,
  pinTopTier: stored?.pinTopTier ?? STRIP_DEFAULTS.pinTopTier,
  speed: stored?.speed ?? STRIP_DEFAULTS.speed,
});

/** A manual selection with nothing chosen would hide the strip; hiding it is
 *  what `isVisible` is for, so the API refuses it and so does this. */
export const validateStrip = (draft: StripDraft): FieldError[] =>
  draft.selection === "manual" && draft.sponsorshipIds.length === 0 ? [{ path: "strip.sponsorshipIds", code: "missingRequiredField" }] : [];

export const isStripDirty = (saved: StripDraft, draft: StripDraft): boolean => JSON.stringify(saved) !== JSON.stringify(draft);

export interface StripPreviewItem {
  id: string;
  name: { ar: string | null; en: string | null };
  tier: SponsorshipTier;
}

export interface StripPreview {
  pinned: StripPreviewItem | null;
  others: StripPreviewItem[];
  /** The first width at which the row stands still; `null` when it moves everywhere. */
  rowFrom: StripBreakpoint | null;
  /** "What they sponsor" shows logo and name below md (ADR-0077 D5 #7). */
  phoneFallsBack: boolean;
}

export const previewStrip = (
  draft: StripDraft,
  sponsors: readonly SponsorRecord[],
  sponsorships: readonly SponsorshipRecord[],
  bannerSponsorshipId: string | null,
  now: Date,
): StripPreview => {
  const names = new Map(sponsors.map((sponsor) => [sponsor._id, sponsor.name]));
  const candidates = sponsorships
    .filter((item) => item.isVisible && item.status === "Active" && names.has(String(item.sponsorId)))
    .map((item) => ({
      id: item._id,
      sponsorId: String(item.sponsorId),
      tier: item.tier as SponsorshipTier,
      targetType: item.targetType as "Federation" | "Championship" | "Event",
      displayOrder: item.displayOrder,
      startDate: item.startDate,
      endDate: item.endDate,
      name: names.get(String(item.sponsorId))!,
    }));
  const banner = selectShowcase(candidates, { bannerSponsorshipId }, now).banner;
  const { pinned, others } = stripItems(candidates, draft, banner?.id ?? null, now);
  const toItem = (item: (typeof candidates)[number]): StripPreviewItem => ({ id: item.id, name: item.name, tier: item.tier });
  return {
    pinned: pinned ? toItem(pinned) : null,
    others: others.map(toItem),
    rowFrom: pinned || others.length > 0 ? stripRowFrom(others.length, Boolean(pinned), draft.displayMode) : null,
    phoneFallsBack: draft.displayMode === "logoNameScope",
  };
};
