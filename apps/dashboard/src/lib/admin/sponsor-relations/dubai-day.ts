/**
 * Contract dates as an editor types them (ADR-0077 D2, ADR-0085 D1): calendar
 * days in Asia/Dubai (UTC+4, no daylight saving), stored as the instants that
 * bound them. A start day is its Dubai midnight; an end day is its last second
 * in Dubai, so the day it names is included — the same rule the site reads with
 * (`isInWindow` in `@uaeaf/content/sponsors`).
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real `YYYY-MM-DD` calendar day. */
export const isDayString = (value: string): boolean => {
  const match = DAY.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const dubaiDayStartIso = (day: string): string | null =>
  isDayString(day) ? new Date(`${day}T00:00:00+04:00`).toISOString() : null;

export const dubaiDayEndIso = (day: string): string | null =>
  isDayString(day) ? new Date(`${day}T23:59:59+04:00`).toISOString() : null;

/** The Dubai day a stored instant falls on, or "" for none. */
export const isoToDubaiDay = (iso: string | null | undefined): string => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(time)) return "";
  return new Date(time + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
};
