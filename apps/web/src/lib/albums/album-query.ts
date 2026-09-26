import { rangeIsPossible } from "@uaeaf/content/time-range";
import type { TimeRange } from "@uaeaf/content/time-range";
import { VIDEO_PERIODS, periodRange } from "@/lib/video/library-query";
import type { VideoPeriod } from "@/lib/video/library-query";
import { isSeasonLabel } from "./season-label";

/**
 * Everything that narrows the album archive, as one address.
 *
 * The same contract the video library and the newsroom keep: every view is a
 * URL a reader can bookmark, send and undo with Back; page 1 is written as no
 * parameter; a filter change returns to page 1; and an unreadable value is
 * dropped rather than being an error, because a stale or hand-edited link
 * should show the archive, not an error page.
 *
 * -- The period vocabulary is the video library's --------------------------
 *
 * The album page offers four of the video library's rolling windows plus
 * custom. It takes them from `VIDEO_PERIODS` rather than declaring its own
 * list, so "last 3 months" cannot mean ninety days on one page and a calendar
 * quarter on the other. `last7` is left out because the approved canvas does
 * not offer it: an album archive is published in occasions, weeks apart, and
 * a seven-day window is empty nearly every day of the year.
 */

export const ALBUM_PERIODS = VIDEO_PERIODS.filter(
  (period): period is Exclude<VideoPeriod, "last7"> => period !== "last7",
);
export type AlbumPeriod = (typeof ALBUM_PERIODS)[number];

/**
 * The filters that narrow to one value, in the order the bar draws them.
 *
 * Each value is an entity's id, except the season's: a season is derived from
 * an album's date and has no entity, so its value is its label (`2025–2026`,
 * `season-label.ts`). Both kinds are carried the same way — as the string the
 * facets list, the address writes and the API is asked for.
 */
export const ALBUM_ENTITY_FILTERS = [
  "season",
  "championship",
  "competition",
  "event",
  "athlete",
  "club",
] as const;
export type AlbumEntityFilter = (typeof ALBUM_ENTITY_FILTERS)[number];

export interface AlbumQuery {
  /** A season label such as `2025–2026`, never an id. */
  season?: string;
  championship?: string;
  /** Meaningful only under a championship; dropped when there is none. */
  competition?: string;
  /** A public event. `event` in the address, `publicEvent` to the API. */
  event?: string;
  athlete?: string;
  club?: string;
  period: AlbumPeriod;
  /** Only meaningful while `period` is `custom`; otherwise derived. */
  range: TimeRange;
  q?: string;
  /** 1-based. Page 1 is written as no parameter at all. */
  page: number;
}

export const EMPTY_ALBUM_QUERY: AlbumQuery = { period: "any", range: {}, page: 1 };

/** Every entity in this system is a Mongo document; anything else in the
 *  address cannot match one, so it is not applied. */
const OBJECT_ID = /^[a-f\d]{24}$/i;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

const reader = (params: Params) => (key: string): string | undefined => {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

const idOrNothing = (value: string | undefined): string | undefined =>
  value !== undefined && OBJECT_ID.test(value) ? value : undefined;

/** Kept exactly as written, en dash included: the label is compared exactly
 *  on its way back into the API, so rewriting it here would filter by a
 *  season nobody chose. */
const seasonOrNothing = (value: string | undefined): string | undefined =>
  value !== undefined && isSeasonLabel(value) ? value : undefined;

const periodOrNothing = (value: string | undefined): AlbumPeriod | undefined =>
  value !== undefined && (ALBUM_PERIODS as readonly string[]).includes(value)
    ? (value as AlbumPeriod)
    : undefined;

/** A query as it arrived in the URL. */
export const readAlbumQuery = (params: Params): AlbumQuery => {
  const one = reader(params);
  const from = one("from") || undefined;
  const to = one("to") || undefined;
  const period = periodOrNothing(one("period")) ?? (from || to ? "custom" : "any");
  const page = Number(one("page"));
  const championship = idOrNothing(one("championship"));

  return {
    season: seasonOrNothing(one("season")),
    championship,
    // A competition names one event inside a championship, so without the
    // championship the address describes a list nobody could have filtered to.
    competition: championship ? idOrNothing(one("competition")) : undefined,
    event: idOrNothing(one("event")),
    athlete: idOrNothing(one("athlete")),
    club: idOrNothing(one("club")),
    period,
    // A range that closes before it opens is not applied, mirroring the API.
    range: period === "custom" && rangeIsPossible(from, to) ? { from, to } : {},
    q: one("q")?.trim() || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

/**
 * The next query after a change.
 *
 * Narrowing changes which albums exist in the list, so the page a reader was on
 * no longer describes anything: every change except an explicit page move
 * returns to page 1. Choosing a different championship drops the competition,
 * which belonged to the old one.
 */
export const nextAlbumQuery = (current: AlbumQuery, change: Partial<AlbumQuery>): AlbumQuery => {
  const merged: AlbumQuery = { ...current, ...change };
  const championshipChanged =
    "championship" in change && change.championship !== current.championship;
  const keepCompetition =
    Boolean(merged.championship) && (!championshipChanged || "competition" in change);

  return {
    ...merged,
    competition: keepCompetition ? merged.competition : undefined,
    range: merged.period === "custom" ? merged.range : {},
    page: change.page ?? (Object.keys(change).length > 0 ? 1 : current.page),
  };
};

/** The query string for the address bar. Empty for the unfiltered archive. */
export const albumSearchParams = (query: AlbumQuery): URLSearchParams => {
  const params = new URLSearchParams();
  for (const key of ALBUM_ENTITY_FILTERS) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  if (query.period !== "any") params.set("period", query.period);
  if (query.period === "custom") {
    if (query.range.from) params.set("from", query.range.from);
    if (query.range.to) params.set("to", query.range.to);
  }
  if (query.q) params.set("q", query.q);
  // `?page=1` beside the archive's own address would be a second URL for one view.
  if (query.page > 1) params.set("page", String(query.page));
  return params;
};

/** A path plus the query, e.g. `/media/albums?season=…`. */
export const albumsHref = (pathname: string, query: AlbumQuery): string => {
  const search = albumSearchParams(query).toString();
  return search ? `${pathname}?${search}` : pathname;
};

/**
 * The request the API is asked for the same view.
 *
 * Built from the same object the address carries, so a shared link cannot
 * describe a list the request does not return. The one rename is `event`,
 * which the API calls `publicEvent`; the rolling periods become the concrete
 * dates they stand for today.
 */
export const albumApiParams = (
  query: AlbumQuery,
  limit: number,
  now: Date = new Date(),
): URLSearchParams => {
  const params = new URLSearchParams({ page: String(query.page), limit: String(limit) });
  if (query.season) params.set("season", query.season);
  if (query.championship) params.set("championship", query.championship);
  if (query.competition) params.set("competition", query.competition);
  if (query.event) params.set("publicEvent", query.event);
  if (query.athlete) params.set("athlete", query.athlete);
  if (query.club) params.set("club", query.club);
  const range = periodRange(query.period, query.range, now);
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  if (query.q) params.set("q", query.q);
  return params;
};

/** One narrowing a reader has applied, as the active-filter chips list it.
 *  `id` is the value the address carries: an entity's id, or the season's
 *  label. */
export type ActiveAlbumFilter =
  | { key: AlbumEntityFilter; id: string }
  | { key: "period"; period: AlbumPeriod; range: TimeRange }
  | { key: "q"; text: string };

/** The narrowings in effect, in the order the bar draws its controls. */
export const activeAlbumFilters = (query: AlbumQuery): ActiveAlbumFilter[] => {
  const active: ActiveAlbumFilter[] = [];
  for (const key of ALBUM_ENTITY_FILTERS) {
    const id = query[key];
    if (id) active.push({ key, id });
  }
  if (query.period !== "any") active.push({ key: "period", period: query.period, range: query.range });
  if (query.q) active.push({ key: "q", text: query.q });
  return active;
};

/** The query with exactly one narrowing removed. Removing the championship
 *  removes its competition too, through `nextAlbumQuery`. */
export const withoutAlbumFilter = (query: AlbumQuery, key: ActiveAlbumFilter["key"]): AlbumQuery =>
  nextAlbumQuery(
    query,
    key === "period" ? { period: "any", range: {} } : { [key]: undefined },
  );

export const hasActiveAlbumFilter = (query: AlbumQuery): boolean =>
  activeAlbumFilters(query).length > 0;
