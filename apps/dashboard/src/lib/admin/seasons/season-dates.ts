/**
 * A season's dates as the editor reads and types them: whole calendar days in
 * Asia/Dubai, stored as instants.
 *
 * Every date of a season — its start and end, each phase's from and to, each
 * key date — is a day, entered and shown in Dubai, and stored as that day's
 * midnight in Dubai expressed in UTC (the convention the local demo seed
 * writes, so a seeded season opens showing the days it was seeded with).
 *
 * Every day is inclusive (owner decision): a season, or a phase, covers the
 * whole of its last day. As a range of instants that is
 * `[midnight of the first day, midnight of the day after the last)` — which is
 * what `dayAfter` supplies wherever something is compared or counted.
 *
 * The offset is read from the time zone itself, not written down as +4, so the
 * arithmetic stays right whatever the zone's rules are.
 */

export const SEASON_TIME_ZONE = "Asia/Dubai";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsOf = (day: string): [number, number, number] | null => {
  const match = DAY.exec(day);
  if (!match) return null;
  const [year, month, date] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, date));
  // A real calendar day: "2026-02-31" is refused rather than rolled forward.
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === date
    ? [year, month, date]
    : null;
};

/** Whether `day` is a real `YYYY-MM-DD` calendar day. */
export const isDay = (day: string): boolean => partsOf(day) !== null;

const WALL_CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: SEASON_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** How far the zone's wall clock runs ahead of UTC at `instant`, in ms. */
const zoneOffset = (instant: number): number => {
  const parts = Object.fromEntries(WALL_CLOCK.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wall - Math.floor(instant / 1000) * 1000;
};

/** `YYYY-MM-DD`, as a date input holds it, to that day's midnight in Dubai as
 *  an ISO instant. `null` for an empty or malformed day. */
export const dayToInstant = (day: string): string | null => {
  const parts = partsOf(day);
  if (!parts) return null;
  const wallMidnight = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  // Read the offset at the first estimate, then again at the answer, so a
  // zone whose offset changed that day still lands on its own midnight.
  const first = wallMidnight - zoneOffset(wallMidnight);
  return new Date(wallMidnight - zoneOffset(first)).toISOString();
};

const DAY_OF = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEASON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A stored instant back to the Dubai day a date input shows. */
export const instantToDay = (instant: string | null): string => {
  if (!instant) return "";
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? "" : DAY_OF.format(date);
};

/** The calendar day after `day`. */
export const nextDay = (day: string): string => {
  const parts = partsOf(day);
  if (!parts) return "";
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1)).toISOString().slice(0, 10);
};

/** Where an inclusive day ends: the Dubai midnight that starts the next day.
 *  `stored` is the instant a last day is stored as. */
export const dayAfter = (stored: string): number => Date.parse(dayToInstant(nextDay(instantToDay(stored))) ?? "");

/** How many calendar days from `fromDay` to `toDay`, both included. */
export const daysIncluded = (fromDay: string, toDay: string): number => {
  const from = partsOf(fromDay);
  const to = partsOf(toDay);
  if (!from || !to) return 0;
  return Math.round((Date.UTC(to[0], to[1] - 1, to[2]) - Date.UTC(from[0], from[1] - 1, from[2])) / DAY_MS) + 1;
};

/**
 * "1 September 2026" / "1 سبتمبر 2026", read on the Dubai calendar, with
 * Latin digits in both languages (the platform's numerals rule).
 *
 * Not `formatShortDate`: that one abbreviates the month and reads the
 * machine's own zone, and a Dubai midnight is the previous day in UTC — the
 * server would print every date one day early.
 */
export const formatSeasonDay = (instant: string, locale: "ar" | "en"): string => {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SEASON_TIME_ZONE,
    numberingSystem: "latn",
  });
};

/** A season's range as one line, both days included:
 *  "1 September 2026 – 31 August 2027". */
export const formatSeasonRange = (start: string, end: string, locale: "ar" | "en"): string =>
  `${formatSeasonDay(start, locale)} – ${formatSeasonDay(end, locale)}`;
