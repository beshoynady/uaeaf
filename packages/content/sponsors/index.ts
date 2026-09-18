/**
 * The sponsor, partner and membership presentation rules shared by the public
 * site and the dashboard (ADR-0083's pattern, ADR-0085): one source for what
 * the site draws and what an editor previews.
 */
export { isInWindow, sponsorshipState } from "./window";
export type { SponsorshipState, SponsorshipStatus, SponsorshipWindowLike } from "./window";
export { displayName } from "./name";
export type { ContentLocale, DisplayName, OrganizationNameLike } from "./name";
export { SPONSORSHIP_TIERS, byTierThenOrder, selectShowcase, sponsorStats } from "./showcase";
export type {
  Showcase,
  ShowcaseSettings,
  ShowcaseSponsorship,
  SponsorStat,
  SponsorStatKey,
  SponsorshipTargetType,
  SponsorshipTier,
} from "./showcase";
export {
  STRIP_DEFAULTS,
  STRIP_GAP,
  STRIP_ITEM_MIN,
  STRIP_PIXELS_PER_SECOND,
  stripCopies,
  stripCopyWidth,
  stripItems,
  stripLoopSeconds,
} from "./strip";
export type { StripDisplayMode, StripItems, StripSettingsLike, StripSpeed } from "./strip";
