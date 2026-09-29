import type { AppLocale } from "@/i18n/routing";

/**
 * A season's dates as the owner defined them (2026-09-29): inclusive calendar
 * days in Asia/Dubai. A season covers the whole of its last day, so the range it
 * spans is `[start of its first day, start of the day after its last day)`.
 *
 * Every date label, day count and "is it now" question on the seasons pages goes
 * through this module, so no page can read a boundary differently from another.
 * The zone is asked for its own offset through `Intl` rather than assumed: the
 * answer is +4 today, but it is the zone's answer, not a constant written here.
 */

export const SEASON_TIME_ZONE = "Asia/Dubai";

/** A calendar day, month 1-based. */
export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

type DateInput = string | Date;

const DAY_MS = 86_400_000;

const toInstant = (value: DateInput): number => (value instanceof Date ? value.getTime() : Date.parse(value));

const WALL_CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: SEASON_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** The zone's wall clock at an instant, read as if it were UTC. */
const wallClockAsUtc = (instant: number): number => {
  const parts = Object.fromEntries(
    WALL_CLOCK.formatToParts(new Date(instant))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
};

/** How far the zone's clock runs ahead of UTC at an instant. */
const zoneOffset = (instant: number): number => wallClockAsUtc(instant) - Math.floor(instant / 1000) * 1000;

const utcDay = (day: CalendarDay): number => Date.UTC(day.year, day.month - 1, day.day);

/** The Dubai calendar day an instant falls on. */
export const dubaiDayOf = (value: DateInput): CalendarDay => {
  const wall = new Date(wallClockAsUtc(toInstant(value)));
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() + 1, day: wall.getUTCDate() };
};

/** The instant a Dubai calendar day begins. Two passes, so a day on which the
 *  zone's offset changed would still resolve to its own midnight. */
export const dubaiDayStart = (day: CalendarDay): Date => {
  const wall = utcDay(day);
  const first = wall - zoneOffset(wall);
  return new Date(wall - zoneOffset(first));
};

const nextDay = (day: CalendarDay): CalendarDay => {
  const next = new Date(utcDay(day) + DAY_MS);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
};

/** The half-open instant range an inclusive span of days covers. */
export const seasonWindow = (start: DateInput, end: DateInput): { from: Date; to: Date } => ({
  from: dubaiDayStart(dubaiDayOf(start)),
  to: dubaiDayStart(nextDay(dubaiDayOf(end))),
});

/** Whether `now` falls on any day of the inclusive span. */
export const isWithinDays = (now: Date, start: DateInput, end: DateInput): boolean => {
  const { from, to } = seasonWindow(start, end);
  return now.getTime() >= from.getTime() && now.getTime() < to.getTime();
};

/** Days from `origin`'s day to `value`'s day: 0 for the same day. */
export const dayIndex = (origin: DateInput, value: DateInput): number =>
  Math.round((utcDay(dubaiDayOf(value)) - utcDay(dubaiDayOf(origin))) / DAY_MS);

/** Days in the inclusive span, both ends counted. */
export const inclusiveDayCount = (start: DateInput, end: DateInput): number => dayIndex(start, end) + 1;

/** `long` 1 September 2026 · `dayMonth` 1 September · `month` September. */
export type SeasonDateStyle = "long" | "dayMonth" | "month";

const OPTIONS: Record<SeasonDateStyle, Intl.DateTimeFormatOptions> = {
  long: { day: "numeric", month: "long", year: "numeric" },
  dayMonth: { day: "numeric", month: "long" },
  month: { month: "long" },
};

/** Latin digits in both languages (Chapter 19 §5), in the season's zone. */
const formatter = (locale: AppLocale, style: SeasonDateStyle): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(locale, { ...OPTIONS[style], timeZone: SEASON_TIME_ZONE, numberingSystem: "latn" });

/** One day, as the reader's language writes it. */
export const formatSeasonDate = (value: DateInput, locale: AppLocale, style: SeasonDateStyle = "long"): string =>
  formatter(locale, style).format(new Date(toInstant(value)));

/** Both ends of an inclusive span, e.g. "September 1, 2026 – August 31, 2027". */
export const formatSeasonRange = (
  start: DateInput,
  end: DateInput,
  locale: AppLocale,
  style: SeasonDateStyle = "long",
): string => formatter(locale, style).formatRange(new Date(toInstant(start)), new Date(toInstant(end)));

/** The machine-readable day for a `<time dateTime>`: `2026-09-01`. */
export const isoDay = (value: DateInput): string => {
  const { year, month, day } = dubaiDayOf(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
