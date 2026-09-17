/**
 * When a sponsorship counts as running (ADR-0077 D2, ADR-0085 D1).
 *
 * The contract names calendar days in Dubai, so the window opens at Dubai
 * midnight of the start day and closes at the end of the end day, whatever
 * time of day the stored instants carry. Nothing is written at expiry: the
 * question is asked at every read, with the clock passed in, so a server that
 * was down overnight cannot leave an expired sponsor on the site.
 *
 * The API keeps a copy of the block between the two RULE markers
 * (`common/utils/sponsorship-window.util.ts`); its test fails when they differ.
 */

export type SponsorshipStatus = "Active" | "Expired" | "Cancelled";

export type SponsorshipState = "upcoming" | "active" | "expired" | "cancelled";

export interface SponsorshipWindowLike {
  startDate: string | Date;
  endDate: string | Date | null;
  status: SponsorshipStatus;
}

// RULE-START
/** Asia/Dubai is UTC+4 with no daylight saving, so a day boundary is arithmetic. */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const instant = (value: string | Date | null | undefined): number =>
  value instanceof Date ? value.getTime() : value ? Date.parse(value) : Number.NaN;

/** The instant Dubai's calendar day containing `at` began. */
const dubaiDayStart = (at: number): number => Math.floor((at + DUBAI_OFFSET_MS) / DAY_MS) * DAY_MS - DUBAI_OFFSET_MS;

/** Inside the window: from Dubai midnight of the start day, through the end of
 *  the end day. A missing end never closes; an unreadable date never opens. */
export const isInWindow = (start: string | Date, end: string | Date | null, now: Date): boolean => {
  const opens = instant(start);
  if (Number.isNaN(opens)) return false;
  const at = now.getTime();
  if (at < dubaiDayStart(opens)) return false;
  if (end === null || end === undefined) return true;
  const closes = instant(end);
  if (Number.isNaN(closes)) return false;
  return at < dubaiDayStart(closes) + DAY_MS;
};

/** The one word the dashboard prints and the site filters on. `Cancelled` and
 *  a manual `Expired` win over the dates: they are the editor's statement. */
export const sponsorshipState = (sponsorship: SponsorshipWindowLike, now: Date): SponsorshipState => {
  if (sponsorship.status === "Cancelled") return "cancelled";
  if (sponsorship.status === "Expired") return "expired";
  if (isInWindow(sponsorship.startDate, sponsorship.endDate, now)) return "active";
  const opens = instant(sponsorship.startDate);
  return !Number.isNaN(opens) && now.getTime() < dubaiDayStart(opens) ? "upcoming" : "expired";
};
// RULE-END
