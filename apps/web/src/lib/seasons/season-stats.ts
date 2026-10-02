import { fetchPublic } from "@/lib/api/public-client";
import type { AlbumListResponse } from "@/lib/albums/album-types";
import type { Paginated } from "@/lib/api/types";
import type { VideoKind, VideoPublic } from "@/lib/video/types";

/**
 * A season's live counts, for the row under its hero and for its archive card.
 *
 * Nothing is stored: albums and videos are counted through the public list
 * endpoints' own `season` filter, asked for by the season's slug. The API
 * resolves a slug to that season's own first to last day, inclusive, in
 * Asia/Dubai — the days its page states — so a count here and the list it
 * summarises cover the same days. `events` is always `null` until public
 * events exist — an unknown count, which a page must not print as zero.
 */

export interface SeasonStats {
  events: null;
  albums: number | null;
  videos: number | null;
}

/**
 * The counts that are known, in the order they are shown. An unknown count is
 * left out rather than printed as zero, so with none known the list is empty
 * and the caller draws nothing. The hero's row and the archive card both read
 * it, so the two never disagree about which counts to show.
 */
export const knownCounts = (stats: SeasonStats): { key: keyof SeasonStats; value: number }[] =>
  (["events", "albums", "videos"] as const).flatMap((key) => {
    const value = stats[key];
    return value === null ? [] : [{ key, value }];
  });

/**
 * The label the album library reads (`2026–2027`, en dash) for a season slug
 * (`2026-2027`), or `null` for a slug that has none. The album library's
 * address carries labels only (`albums/season-label.ts`), so a link into it
 * from a season is written with this; a label covers 1 September to
 * 1 September, not the season's own days.
 */
export const seasonLabelOf = (slug: string): string | null => {
  const match = /^(\d{4})-(\d{4})$/.exec(slug);
  return match && Number(match[2]) === Number(match[1]) + 1 ? `${match[1]}\u2013${match[2]}` : null;
};

const listQuery = (slug: string, limit: number, kind?: VideoKind): string =>
  new URLSearchParams({ season: slug, page: "1", limit: String(limit), ...(kind ? { kind } : {}) }).toString();

/** The season's first albums, newest first, with the total across every page. */
export const loadSeasonAlbums = (slug: string, limit: number): Promise<AlbumListResponse | null> =>
  fetchPublic<AlbumListResponse>(`/albums/public?${listQuery(slug, limit)}`, ["albums"]);

/** The season's first videos, newest first, with the total across every page;
 *  `kind` narrows to landscape videos or to reels. */
export const loadSeasonVideos = (
  slug: string,
  limit: number,
  kind?: VideoKind,
): Promise<Paginated<VideoPublic> | null> =>
  fetchPublic<Paginated<VideoPublic>>(`/videos/public?${listQuery(slug, limit, kind)}`, ["videos"]);

const totalOf = (page: { total?: unknown } | null): number | null =>
  typeof page?.total === "number" ? page.total : null;

/** The counts two list reads already carry. */
export const statsFrom = (
  albums: { total?: unknown } | null,
  videos: { total?: unknown } | null,
): SeasonStats => ({ events: null, albums: totalOf(albums), videos: totalOf(videos) });

/** The counts alone: one row of each list, for the total it carries. */
export const fetchSeasonStats = async (slug: string): Promise<SeasonStats> => {
  const [albums, videos] = await Promise.all([loadSeasonAlbums(slug, 1), loadSeasonVideos(slug, 1)]);
  return statsFrom(albums, videos);
};
