/**
 * What "this week" means, for every screen that narrows a list by date.
 *
 * ── Why this is shared and the markup is not ───────────────────────────────
 *
 * The public news filter and the newsroom's own list must agree about the
 * window: an editor narrowing their list to "this month" and a visitor
 * narrowing the feed to "this month" have to be looking at the same days, or
 * the editor cannot tell what the public sees. That agreement is arithmetic,
 * and arithmetic written twice drifts.
 *
 * The controls themselves are each app's own, deliberately. The dashboard's
 * `field-standard.spec.tsx` scans its own source and requires every control to
 * be one of its shared field components; a control living in this package
 * would not be scanned, which is worse than a second copy — it would bypass a
 * contract rather than satisfy it. So the vocabulary, the boundaries and the
 * validation live here, and each app renders them with its own approved
 * controls.
 *
 * ── Why UTC throughout ─────────────────────────────────────────────────────
 *
 * The API compares against `publishDate`, stamps it in UTC, and takes `to` to
 * the end of its day in UTC. A local-midnight boundary would add or drop a day
 * at every offset — silently, because the result still looks like a list.
 */

/** The windows a reader asks for by name, in the order they are offered. */
export const TIME_RANGE_PRESETS = ["today", "thisWeek", "thisMonth", "thisYear"] as const;
export type TimeRangePreset = (typeof TIME_RANGE_PRESETS)[number];

/** A window, as the API's `from`/`to` parameters take it: plain ISO dates. */
export interface TimeRange {
  from?: string;
  to?: string;
}

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Monday of the week `date` falls in.
 *
 * Monday-first, because that is the working week the federation's calendar is
 * published on. `getUTCDay()` is 0 on Sunday, so the naive subtraction sends a
 * Sunday reader six days back into the week before — the off-by-one this
 * expression exists to avoid.
 */
const startOfWeek = (date: Date): Date => {
  const day = date.getUTCDay();
  const backToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - backToMonday);
  return monday;
};

/**
 * The window a named preset covers, ending today.
 *
 * Never ending in the future: a range running to the end of the month would
 * include days nothing can have been published on, and a reader would read the
 * empty tail as a newsroom that had stopped.
 */
export const presetRange = (preset: TimeRangePreset, now: Date = new Date()): TimeRange => {
  const to = isoDate(now);

  switch (preset) {
    case "today":
      return { from: to, to };
    case "thisWeek":
      return { from: isoDate(startOfWeek(now)), to };
    case "thisMonth":
      return { from: `${isoDate(now).slice(0, 7)}-01`, to };
    case "thisYear":
      return { from: `${now.getUTCFullYear()}-01-01`, to };
  }
};

/**
 * Which preset a range is, if it is one.
 *
 * So a page opened from a shared link shows the right button pressed rather
 * than "custom" over a range that is exactly this month. Null for a range
 * nobody could have reached by pressing a button, and for no range at all.
 */
export const activePreset = (range: TimeRange, now: Date = new Date()): TimeRangePreset | null => {
  if (!range.from && !range.to) {
    return null;
  }

  return (
    TIME_RANGE_PRESETS.find((preset) => {
      const candidate = presetRange(preset, now);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? null
  );
};

/**
 * Whether a window could hold anything.
 *
 * Mirrors the server, which refuses a range that closes before it opens and
 * ignores a bound that is not a date. A control stricter than the API would
 * refuse what the API accepts; a control looser than it would send a request
 * that comes back 400.
 */
export const rangeIsPossible = (from?: string, to?: string): boolean => {
  if (!from || !to) {
    return true;
  }

  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    // Not applied upstream, so not judged here either.
    return true;
  }

  return end >= start;
};
