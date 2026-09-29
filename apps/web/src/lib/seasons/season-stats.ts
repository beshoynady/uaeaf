import { fetchPublic } from "@/lib/api/public-client";
import type { AlbumListResponse } from "@/lib/albums/album-types";
import type { Paginated } from "@/lib/api/types";
import type { VideoPublic } from "@/lib/video/types";

/**
 * A season's live counts, for the row under its hero and for its archive card.
 *
 * Nothing is stored: albums and videos are counted through the public list
 * endpoints' own `season` filter, which resolves a label against the season's
 * record and falls back to the September-to-August range for a label with no
 * record. `events` is always `null` until public events exist — an unknown
 * count, which a page must not print as zero.
 */

export interface SeasonStats {
  events: null;
  albums: number | null;
  videos: number | null;
}

/**
 * The label the media filters read (`2026–2027`, en dash) for a season slug
 * (`2026-2027`), or `null` for a slug that has none. A label the API would
 * refuse is never sent: it ignores an unreadable `season` and answers the whole
 * library, which would then be counted as this season's.
 */
export const seasonLabelOf = (slug: string): string | null => {
  const match = /^(\d{4})-(\d{4})$/.exec(slug);
  return match && Number(match[2]) === Number(match[1]) + 1 ? `${match[1]}–${match[2]}` : null;
};

const listQuery = (label: string, limit: number): string =>
  new URLSearchParams({ season: label, page: "1", limit: String(limit) }).toString();

/** The season's first albums, newest first, with the total across every page. */
export const loadSeasonAlbums = (slug: string, limit: number): Promise<AlbumListResponse | null> => {
  const label = seasonLabelOf(slug);
  return label
    ? fetchPublic<AlbumListResponse>(`/albums/public?${listQuery(label, limit)}`, ["albums"])
    : Promise.resolve(null);
};

/** The season's first videos, newest first, with the total across every page. */
export const loadSeasonVideos = (slug: string, limit: number): Promise<Paginated<VideoPublic> | null> => {
  const label = seasonLabelOf(slug);
  return label
    ? fetchPublic<Paginated<VideoPublic>>(`/videos/public?${listQuery(label, limit)}`, ["videos"])
    : Promise.resolve(null);
};

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
