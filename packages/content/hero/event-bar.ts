/**
 * The next-event bar's state, and the federation's clock (owner decision
 * 2026-09-17).
 *
 * The event is typed by an editor: a label, a name and a venue in both
 * languages, and when it starts and ends. The bar counts down before the start,
 * says it is running between the start and the end, and is not drawn once the
 * end has come or when anything it would need to say is missing. `startsAt` and
 * `endsAt` are instants, so the countdown is the same wherever the reader is;
 * `Asia/Dubai` (UTC+4, no daylight saving) is where an editor types the time and
 * how it is written back.
 */

export interface NextEventLike {
  isVisible: boolean;
  label: { ar: string; en: string };
  name: { ar: string; en: string };
  venue: { ar: string; en: string };
  startsAt: string;
  endsAt: string;
}

export type EventBarState =
  | { state: "before"; days: number; hours: number; minutes: number }
  | { state: "live" }
  | { state: "hidden" };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DUBAI_OFFSET = "+04:00";

const filled = (text: { ar: string; en: string } | undefined) =>
  Boolean(text?.ar?.trim() && text?.en?.trim());

const instant = (value: string | undefined): number => (value ? Date.parse(value) : Number.NaN);

export const eventBarState = (event: NextEventLike | null, now: Date): EventBarState => {
  if (!event?.isVisible) return { state: "hidden" };
  if (!filled(event.label) || !filled(event.name) || !filled(event.venue)) return { state: "hidden" };

  const starts = instant(event.startsAt);
  const ends = instant(event.endsAt);
  if (Number.isNaN(starts) || Number.isNaN(ends) || ends < starts) return { state: "hidden" };

  const at = now.getTime();
  if (at >= ends) return { state: "hidden" };
  if (at >= starts) return { state: "live" };

  const left = starts - at;
  return {
    state: "before",
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
  };
};

/** A `datetime-local` value typed in Dubai (`2026-10-16T18:00`) as the instant
 *  it names; `null` for an empty or unreadable value. */
export const dubaiLocalToIso = (local: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const time = Date.parse(`${local}:00${DUBAI_OFFSET}`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/** An instant as the Dubai wall-clock value a `datetime-local` input shows. */
export const isoToDubaiLocal = (iso: string): string => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  // Shift into Dubai's wall clock, then read the UTC fields of the shifted time.
  return new Date(time + 4 * HOUR).toISOString().slice(0, 16);
};

/** The start as each language writes a date and a time, in Dubai, with Western
 *  digits in Arabic as everywhere else on the site. */
export const formatEventDateTime = (iso: string, locale: "ar" | "en"): string => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const tag = locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB";
  // Two formatters joined by the language's own comma: a combined date-time
  // format inserts words ("at") that vary between ICU versions, so the server's
  // and the browser's copies could disagree and break hydration.
  const date = new Intl.DateTimeFormat(tag, { timeZone: "Asia/Dubai", day: "numeric", month: "long", year: "numeric" });
  const clock = new Intl.DateTimeFormat(tag, { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${date.format(time)}${locale === "ar" ? "، " : ", "}${clock.format(time)}`;
};
