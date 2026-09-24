/**
 * The clock the editor is reading.
 *
 * A broadcast's end time is set by someone standing at an event in the UAE and
 * read back by whoever is on duty later. Both are reading a wall clock in
 * Dubai, so that is the zone these fields are drawn in — the value itself is
 * stored as an instant, and only the display is zoned.
 *
 * Lifted out of `go-live-dialog.tsx` when the dialog became a page: the form
 * converts wall-clock to instant and the banner formats an instant back, and
 * two copies of a timezone conversion is one copy too many.
 */

const DUBAI = "Asia/Dubai";
const TWO_DIGITS = "2-digit";

/**
 * Gulf Standard Time is UTC+4 all year. The UAE has observed no daylight
 * saving since 1972, so this is a constant rather than a lookup — and it has
 * to be a number somewhere, because turning a wall-clock reading back into an
 * instant is arithmetic the platform gives us no direct call for.
 */
const DUBAI_OFFSET_HOURS = 4;

/** The design's default: long enough for a session, short enough that a
 *  broadcast nobody remembers to end does not linger overnight. */
export const DEFAULT_LIVE_HOURS = 3;

export const expectedEndDefault = (now: Date = new Date()): Date =>
  new Date(now.getTime() + DEFAULT_LIVE_HOURS * 60 * 60 * 1000);

/** An instant, split into the two fields the form draws. */
export const dubaiParts = (date: Date): { date: string; time: string } => ({
  date: date.toLocaleDateString("en-CA", { timeZone: DUBAI }),
  time: date.toLocaleTimeString("en-GB", { hour: TWO_DIGITS, minute: TWO_DIGITS, timeZone: DUBAI }),
});

/** Just the time, for reading an instant back — the banner's "ends at 22:00". */
export const dubaiClock = (date: Date): string => dubaiParts(date).time;

/**
 * A date as every video screen writes it: "14 Mar 2026" / "١٤ مارس ٢٠٢٦" with
 * Western digits in both languages (Chapter 19 §5).
 *
 * Here rather than in each screen because the digits rule was spelled out four
 * separate times — the table, both previews and the finished-broadcast card —
 * and a rule restated four times is a rule three of them can drift from.
 */
export const formatShortDate = (value: string | Date, locale: "ar" | "en"): string | null => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  });
};

/**
 * The instant an editor means when they type a date and a time.
 *
 * `new Date("2026-03-14T21:30:00")` parses in the BROWSER's zone, and the two
 * fields were rendered in Dubai's — so on any machine that is not at UTC+4
 * every broadcast would end at the wrong moment, silently, and on a machine
 * behind Dubai it could be stored already expired and never appear on the site
 * at all. The date and time are therefore read as Dubai wall-clock and
 * converted explicitly.
 *
 * Answers `null` for a pair that is not a date, rather than an Invalid Date
 * that would travel to the API as `null` and be refused there with a message
 * about a field the editor did not touch.
 */
export const dubaiInstant = (date: string, time: string): string | null => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if ([year, month, day, hour, minute].some((part) => !Number.isFinite(part))) return null;

  const instant = new Date(Date.UTC(year, month - 1, day, hour - DUBAI_OFFSET_HOURS, minute));
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
};
