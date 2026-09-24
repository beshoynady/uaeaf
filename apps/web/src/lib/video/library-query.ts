import { presetRange, rangeIsPossible } from "@uaeaf/content/time-range";
import type { TimeRange } from "@uaeaf/content/time-range";
import { VIDEO_CATEGORIES, VIDEO_KINDS, VIDEO_PLATFORMS } from "./types";
import type { VideoCategory, VideoKind, VideoPlatform } from "./types";

/**
 * Everything that narrows the video library, as one address.
 *
 * The same rule `feed-query.ts` established for the newsroom, and deliberately
 * the same shape: every view of the library is a page of it, so every view is
 * a URL a reader can bookmark, send to a colleague and undo with the browser's
 * own back button. Filters held in component state cannot do any of that.
 *
 * -- Why a second module and not the newsroom's ----------------------------
 *
 * The axes are different — kind, platform, category, season — and so are the
 * time windows (below). What the two share is the arithmetic and the URL
 * contract, and those come from `@uaeaf/content/time-range` and from following
 * the same conventions here: page 1 is written as no parameter, a filter
 * change returns to page 1, and an unreadable value is dropped rather than
 * being an error.
 *
 * -- Why these presets and not the newsroom's ------------------------------
 *
 * The brief names them: any time, 7 days, 30 days, 3 months, this year,
 * custom. Those are ROLLING windows counted back from today, where the
 * newsroom's ("this week", "this month") are calendar ones. They answer a
 * different question — "what is recent" rather than "what happened in this
 * period" — so they are this page's own list. `thisYear` is the one they
 * share, and it comes from the shared function rather than being recomputed.
 */

export const VIDEO_PERIODS = ["any", "last7", "last30", "last90", "thisYear", "custom"] as const;
export type VideoPeriod = (typeof VIDEO_PERIODS)[number];

export type KindTab = "all" | VideoKind;

export interface LibraryQuery {
  /** The tab. `all` is the missing parameter rather than a written value. */
  kind: KindTab;
  platform?: VideoPlatform;
  category?: VideoCategory;
  /** A season label as the API writes it, e.g. `2025-2026`. */
  season?: string;
  /** `<ownerType>:<id>`. Nothing produces one today — no championship or event
   *  entity exists — but the API filters by it and the URL carries it, so the
   *  day the picker has options nothing about this file changes. */
  association?: string;
  search?: string;
  period: VideoPeriod;
  /** Only meaningful while `period` is `custom`; otherwise derived. */
  range: TimeRange;
  /** 1-based. Page 1 is written as no parameter at all. */
  page: number;
}

const DAYS = { last7: 7, last30: 30, last90: 90 } as const;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** The window a named period covers, ending today. */
export const periodRange = (period: VideoPeriod, custom: TimeRange, now: Date = new Date()): TimeRange => {
  if (period === "any") return {};
  if (period === "custom") return custom;
  if (period === "thisYear") return presetRange("thisYear", now);

  const back = new Date(now);
  back.setUTCDate(back.getUTCDate() - DAYS[period]);
  return { from: isoDate(back), to: isoDate(now) };
};

const oneOf = <T extends string>(list: readonly T[], value: string | undefined): T | undefined =>
  value !== undefined && (list as readonly string[]).includes(value) ? (value as T) : undefined;

/**
 * A query as it arrived in the URL.
 *
 * Anything unreadable is dropped rather than refused: a stale or hand-edited
 * link shows the library, not an error page. That is the same choice the API
 * makes for `season` and `from`/`to` — shape it, then ignore what will not
 * parse.
 */
export const readLibraryQuery = (params: Record<string, string | string[] | undefined>): LibraryQuery => {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const from = one("from");
  const to = one("to");
  const period = oneOf(VIDEO_PERIODS, one("period")) ?? (from || to ? "custom" : "any");
  const page = Number(one("page"));
  const season = one("season");
  const association = one("association");

  return {
    kind: oneOf(VIDEO_KINDS, one("kind")) ?? "all",
    platform: oneOf(VIDEO_PLATFORMS, one("platform")),
    category: oneOf(VIDEO_CATEGORIES, one("category")),
    season: /^\d{4}-\d{4}$/.test(season ?? "") ? season : undefined,
    association: /^[a-zA-Z]+:[a-f\d]{24}$/.test(association ?? "") ? association : undefined,
    search: one("search")?.trim() || undefined,
    period,
    // A range that closes before it opens is not applied, mirroring the API.
    range: period === "custom" && rangeIsPossible(from, to) ? { from, to } : {},
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

/**
 * The narrowings the address and the API request spell identically — same
 * keys, same values, same order.
 *
 * Written once because the two are one statement about which videos are being
 * shown, made to a reader and to the server. Two copies of it are two chances
 * for a shared link to describe a list the request does not return.
 */
const writeNarrowings = (params: URLSearchParams, query: LibraryQuery): void => {
  if (query.kind !== "all") params.set("kind", query.kind);
  if (query.platform) params.set("platform", query.platform);
  if (query.category) params.set("category", query.category);
  if (query.season) params.set("season", query.season);
  if (query.association) params.set("association", query.association);
  if (query.search) params.set("search", query.search);
};

/**
 * The library's address for a changed query.
 *
 * Narrowing changes which videos exist in the list, so the page a reader was
 * on no longer describes anything — page 3 of an unfiltered library is usually
 * past the end of one platform. Every change except an explicit page move
 * returns to the first page, which is where the results they just asked for
 * begin. Identical to `feedHref`, on purpose.
 */
export const libraryHref = (current: LibraryQuery, change: Partial<LibraryQuery> = {}): string => {
  const next: LibraryQuery = {
    ...current,
    ...change,
    page: change.page ?? (Object.keys(change).length > 0 ? 1 : current.page),
  };

  const query = new URLSearchParams();
  writeNarrowings(query, next);
  if (next.period !== "any") query.set("period", next.period);
  if (next.period === "custom") {
    if (next.range.from) query.set("from", next.range.from);
    if (next.range.to) query.set("to", next.range.to);
  }
  // Page 1 is the library's own address. `?page=1` beside it would be a second
  // URL for one view.
  if (next.page > 1) query.set("page", String(next.page));

  const search = query.toString();
  return search ? `/media/videos?${search}` : "/media/videos";
};

/**
 * The one video a link points at, if it points at one.
 *
 * `video` is not a filter and is deliberately absent from `LibraryQuery`: it
 * does not narrow the list, it says which of the list is open in the player.
 * Keeping it out means `libraryHref` drops it on every filter change, which is
 * right — changing a filter under an open player would leave a dialog showing
 * a video that is no longer in the list behind it.
 */
export const readVideoParam = (params: Record<string, string | string[] | undefined>): string | undefined => {
  const raw = params.video;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Shape only. Whether the id resolves to a published video is the page's
  // question, and a stale link answers it by simply not opening the player.
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value) ? value : undefined;
};

/**
 * The address of one video inside the current view.
 *
 * Built from the same `LibraryQuery` the filters write, so a link to a video
 * carries the filters the reader had set — send someone "reels from TikTok,
 * this one" and they land on exactly that. Passing `null` produces the same
 * address with no video, which is what closing the player writes back.
 */
export const videoHref = (current: LibraryQuery, videoId: string | null): string => {
  const base = libraryHref(current, { page: current.page });
  if (!videoId) return base;
  return `${base}${base.includes("?") ? "&" : "?"}video=${encodeURIComponent(videoId)}`;
};

/** How many filters are narrowing the list, for the count on the Filter
 *  button. The tab and the page are not filters: the tab is a view the reader
 *  can already see they are on, and the page is not a narrowing at all. */
export const activeFilterCount = (query: LibraryQuery): number =>
  [query.platform, query.category, query.season, query.association, query.search].filter(Boolean).length +
  (query.period === "any" ? 0 : 1);

/** The query the API is asked, built from the same object the URL carries so
 *  the two cannot drift. */
export const apiQuery = (query: LibraryQuery, limit: number, now: Date = new Date()): string => {
  const range = periodRange(query.period, query.range, now);
  const params = new URLSearchParams({ page: String(query.page), limit: String(limit) });

  writeNarrowings(params, query);
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);

  return params.toString();
};
