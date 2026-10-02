import { dayAfter } from "./season-dates";
import type { AdminSeason, SeasonContent, SeasonPhase } from "./types";

/**
 * What the seasons list derives from each row: its order, where it stands in
 * time, which badge it wears, and what content still falls inside it.
 *
 * Pure and client-safe, for the reason `albums/list-filters.ts` gives: the
 * admin `GET /seasons` returns every live season in one answer, and nothing
 * here needs a second request.
 *
 * Every date is an inclusive Dubai day (see `season-dates.ts`), so a season
 * or a phase runs from the midnight of its first day to the midnight that
 * starts the day after its last: `[start, dayAfter(end))`. The API reads the
 * same range, so the list never says "ended" about a season the public site
 * still shows as running on its last day.
 */

/** The season's name in the reader's language, falling back to the other
 *  half. Here rather than beside the row parts so the server pages can call
 *  it too — a function exported from a client module is not callable there. */
export const seasonNameOf = (season: Pick<AdminSeason, "name">, locale: "ar" | "en"): string =>
  season.name[locale] || season.name.ar || season.name.en;

/** Most recently started first, the order the archive and the API list use;
 *  the address breaks a tie, so the order is the same on every read. */
export const byNewestStart = (a: AdminSeason, b: AdminSeason): number =>
  Date.parse(b.startDate) - Date.parse(a.startDate) || a.slug.localeCompare(b.slug);

export type SeasonTiming = "upcoming" | "running" | "ended";

/** Whether `instant` falls on any of the inclusive days `from`–`to`. */
const inside = (instant: number, from: string, to: string): boolean =>
  instant >= Date.parse(from) && instant < dayAfter(to);

export const seasonTiming = (season: AdminSeason, now: Date): SeasonTiming => {
  const at = now.getTime();
  if (at < Date.parse(season.startDate)) return "upcoming";
  return at < dayAfter(season.endDate) ? "running" : "ended";
};

/** The phase today falls in, or `null` between phases and outside the
 *  season. Phases of different types may run together (registration during
 *  competition); the first listed wins, which is the order the editor wrote
 *  them in. */
export const currentPhaseOf = (season: AdminSeason, now: Date): SeasonPhase | null =>
  season.phases.find((phase) => inside(now.getTime(), phase.from, phase.to)) ?? null;

/**
 * The one badge a row wears.
 *
 * Current first: it is the fact the list exists to show, and a current season
 * is necessarily the one visitors are sent to. Then the states that keep a
 * season off the public site, most final first — archived, hidden, taken
 * down, draft — because "why can nobody see it" is the question those rows
 * raise.
 */
export type SeasonBadge = "current" | "archived" | "hidden" | "unpublished" | "draft" | "live";

export const badgeOf = (season: AdminSeason): SeasonBadge => {
  if (season.isCurrent) return "current";
  if (season.publicationState === "Archived") return "archived";
  if (!season.isVisible) return "hidden";
  if (season.publicationState === "Unpublished") return "unpublished";
  return season.publicationState === "Draft" ? "draft" : "live";
};

/**
 * The line under the badge, when there is something worth saying.
 *
 * - The current phase, on the current season: what the public hero shows.
 * - "Not published yet", on a draft. A season taken down says so in its
 *   badge; it has been published.
 * - "Closing summary not written", on a live season that has ended —
 *   the public page shows that summary from the day after the season ends,
 *   so its absence is visible to visitors.
 */
export type SeasonNote =
  | { kind: "phase"; phase: SeasonPhase }
  | { kind: "notPublished" }
  | { kind: "closingMissing" }
  | null;

export const noteOf = (season: AdminSeason, now: Date): SeasonNote => {
  if (season.isCurrent) {
    const phase = currentPhaseOf(season, now);
    return phase ? { kind: "phase", phase } : null;
  }
  if (season.publicationState === "Draft") return { kind: "notPublished" };
  if (season.publicationState !== "Live") return null;
  if (seasonTiming(season, now) === "ended" && !season.closingSummary) return { kind: "closingMissing" };
  return null;
};

/**
 * How many of `instants` fall on the season's days, its last day included —
 * the range `SeasonsService.remove` checks `albums.eventDate` and
 * `videos.publishedAt` against before it refuses a delete. `null` when the library
 * could not be read: an unknown count must not read as zero.
 */
export const countInSeason = (
  season: Pick<AdminSeason, "startDate" | "endDate">,
  instants: readonly (string | null)[] | null,
): number | null => {
  if (instants === null) return null;
  return instants.filter((instant) => instant !== null && inside(Date.parse(instant), season.startDate, season.endDate))
    .length;
};

/**
 * Whether a delete would be refused for content, as far as the screen can
 * tell: `true` when any count is above zero, `false` when every count is
 * known and zero, `null` when a count is unknown and none is above zero.
 * Only `true` disables the delete — for `null` the API decides, and its
 * refusal is shown.
 */
export const isContentLinked = (content: SeasonContent): boolean | null => {
  const counts = [content.albums, content.videos];
  if (counts.some((count) => count !== null && count > 0)) return true;
  return counts.every((count) => count === 0) ? false : null;
};
