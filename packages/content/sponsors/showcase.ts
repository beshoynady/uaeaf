/**
 * Who fills the sponsors section's banner and grid (ADR-0085 D5.1), and its
 * three figures (ADR-0077 D6). Shared by the site and the dashboard preview, so
 * both answer from the same function.
 *
 * Everything is decided at `now`: the site's data may be cached for a while, and
 * a sponsorship that ended during that time must not stay in the banner.
 */
import { isInWindow } from "./window";

/** Highest first. */
export const SPONSORSHIP_TIERS = ["Strategic", "Official", "Supporting"] as const;
export type SponsorshipTier = (typeof SPONSORSHIP_TIERS)[number];

export type SponsorshipTargetType = "Federation" | "Championship" | "Event";

export interface ShowcaseSponsorship {
  id: string;
  sponsorId: string;
  tier: SponsorshipTier;
  targetType: SponsorshipTargetType;
  displayOrder: number;
  startDate: string;
  endDate: string | null;
}

export interface ShowcaseSettings {
  /** The editor's choice among the highest tier present; ignored otherwise. */
  bannerSponsorshipId: string | null;
}

export interface Showcase<T extends ShowcaseSponsorship> {
  banner: T | null;
  grid: T[];
}

const tierRank = (tier: SponsorshipTier): number => SPONSORSHIP_TIERS.indexOf(tier);

/** Tier first, then the editor's order. */
export const byTierThenOrder = <T extends ShowcaseSponsorship>(a: T, b: T): number =>
  tierRank(a.tier) - tierRank(b.tier) || a.displayOrder - b.displayOrder;

const running = <T extends ShowcaseSponsorship>(items: readonly T[], now: Date): T[] =>
  items.filter((item) => isInWindow(item.startDate, item.endDate, now));

/**
 * The banner takes the highest tier present at `now` — never pinned to
 * Strategic. Among that tier the editor's preference wins, otherwise the lowest
 * display order. The banner's sponsorship is not repeated in the grid.
 */
export const selectShowcase = <T extends ShowcaseSponsorship>(
  items: readonly T[],
  settings: ShowcaseSettings,
  now: Date,
): Showcase<T> => {
  const sorted = running(items, now).sort(byTierThenOrder);
  if (sorted.length === 0) return { banner: null, grid: [] };

  const topTier = sorted[0].tier;
  const preferred = sorted.find((item) => item.tier === topTier && item.id === settings.bannerSponsorshipId);
  const banner = preferred ?? sorted[0];
  return { banner, grid: sorted.filter((item) => item !== banner) };
};

export type SponsorStatKey = "sponsors" | "years" | "championships";

export interface SponsorStat {
  key: SponsorStatKey;
  value: number;
}

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** The calendar date in Dubai, as year, month and day. */
const dubaiDate = (at: Date) => {
  const shifted = new Date(at.getTime() + DUBAI_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
};

/** Whole years from `start` to `now`, counted on Dubai's calendar. */
const wholeYears = (start: Date, now: Date): number => {
  const from = dubaiDate(start);
  const to = dubaiDate(now);
  const beforeAnniversary = to.month < from.month || (to.month === from.month && to.day < from.day);
  return to.year - from.year - (beforeAnniversary ? 1 : 0);
};

/**
 * The section's figures, computed from the sponsorships running at `now` so
 * they cannot contradict the cards below them (ADR-0077 D6). A figure below one
 * is not printed: "0 years" says nothing.
 */
export const sponsorStats = (items: readonly ShowcaseSponsorship[], now: Date): SponsorStat[] => {
  const current = running(items, now);
  if (current.length === 0) return [];

  const earliest = Math.min(...current.map((item) => Date.parse(item.startDate)));
  const stats: SponsorStat[] = [
    { key: "sponsors", value: new Set(current.map((item) => item.sponsorId)).size },
    { key: "years", value: wholeYears(new Date(earliest), now) },
    { key: "championships", value: current.filter((item) => item.targetType === "Championship").length },
  ];
  return stats.filter((stat) => stat.value >= 1);
};
