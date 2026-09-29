/**
 * Whole calendar days in the platform's time zone, as half-open instants.
 *
 * A date whose meaning is a calendar day — a season's first and last day, a
 * phase's, an event's — is inclusive and read in Asia/Dubai (owner decision
 * 2026-09-29): a season covers the whole of its last day, Dubai time. Stored
 * values are instants (the dashboard sends each day's Dubai midnight), so every
 * comparison goes through `dubaiDayRange`, which turns the two days into
 * `[start of the first day, start of the day after the last day)`. Half-open,
 * so two ranges meeting at a day boundary never share an instant.
 *
 * The offset is read from the time zone through `Intl`, not written down as a
 * number: Dubai keeps +4 all year today, and a rule that reads the zone stays
 * right if that ever changes, where a constant that happens to be right does
 * not.
 *
 * `videos/season.ts`'s `seasonRange` is a different rule (UTC midnight,
 * September to September, derived from a label) and stays separate: albums and
 * videos are filed by it.
 */

export const PLATFORM_TIME_ZONE = 'Asia/Dubai';

/** `from <= instant < to`. */
export interface DayRange {
  from: Date;
  to: Date;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const wallClockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: PLATFORM_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/** What a clock in the platform's zone reads at `instant`. */
const wallClockAt = (instant: number): WallClock => {
  const read: Record<string, number> = {};
  for (const part of wallClockFormat.formatToParts(instant)) {
    if (part.type !== 'literal') read[part.type] = Number(part.value);
  }
  return read as unknown as WallClock;
};

/** How far the zone's clock runs ahead of UTC at `instant`, in milliseconds. */
const offsetAt = (instant: number): number => {
  const clock = wallClockAt(instant);
  const clockAsUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
  const wholeSeconds = Math.floor(instant / 1000) * 1000;
  return clockAsUtc - wholeSeconds;
};

/** The instant the zone's calendar day `year-month-day` begins. `day` may run
 *  past the month's end; `Date.UTC` carries it into the next month. */
const startOfZoneDay = (year: number, month: number, day: number): number => {
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  // Read the offset a second time at the first answer, so a zone whose offset
  // differs between UTC midnight and local midnight still lands on the latter.
  const firstGuess = midnightAsUtc - offsetAt(midnightAsUtc);
  return midnightAsUtc - offsetAt(firstGuess);
};

/** The instant the Dubai calendar day containing `at` began. */
export const dubaiDayStart = (at: Date): Date => {
  const clock = wallClockAt(at.getTime());
  return new Date(startOfZoneDay(clock.year, clock.month, clock.day));
};

/** The instant the Dubai calendar day after the one containing `at` begins. */
export const dubaiNextDayStart = (at: Date): Date => {
  const clock = wallClockAt(at.getTime());
  return new Date(startOfZoneDay(clock.year, clock.month, clock.day + 1));
};

/** The half-open range covering `firstDay` through the whole of `lastDay`,
 *  both read as Dubai calendar days whatever time of day they carry. */
export const dubaiDayRange = (firstDay: Date, lastDay: Date): DayRange => ({
  from: dubaiDayStart(firstDay),
  to: dubaiNextDayStart(lastDay),
});

export const isWithinDayRange = (at: Date, range: DayRange): boolean =>
  at.getTime() >= range.from.getTime() && at.getTime() < range.to.getTime();

/** Two ranges overlap exactly when each starts before the other ends. */
export const dayRangesOverlap = (a: DayRange, b: DayRange): boolean =>
  a.from.getTime() < b.to.getTime() && b.from.getTime() < a.to.getTime();

/** `inner` lies wholly inside `outer`, touching either end allowed. */
export const dayRangeContains = (outer: DayRange, inner: DayRange): boolean =>
  inner.from.getTime() >= outer.from.getTime() && inner.to.getTime() <= outer.to.getTime();
