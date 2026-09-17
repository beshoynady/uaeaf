/**
 * The API's copy of the sponsorship window (ADR-0077 D2, ADR-0085 D1).
 *
 * The web and the dashboard read the same rule from `@uaeaf/content/sponsors`
 * (`window.ts`). The API cannot import that workspace (its compiled root is
 * `src`), so the block between the RULE markers is repeated here verbatim,
 * and `sponsorship-window.util.spec.ts` fails the day the two copies disagree.
 */

export type SponsorshipStatus = 'Active' | 'Expired' | 'Cancelled';

export type SponsorshipState = 'upcoming' | 'active' | 'expired' | 'cancelled';

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
  if (sponsorship.status === 'Cancelled') return 'cancelled';
  if (sponsorship.status === 'Expired') return 'expired';
  if (isInWindow(sponsorship.startDate, sponsorship.endDate, now)) return 'active';
  const opens = instant(sponsorship.startDate);
  return !Number.isNaN(opens) && now.getTime() < dubaiDayStart(opens) ? 'upcoming' : 'expired';
};
// RULE-END
