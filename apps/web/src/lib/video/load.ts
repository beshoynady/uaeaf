import { fetchPublic } from "@/lib/api/public-client";
import { fetchPublicMedia } from "@/lib/api/media";
import type { MediaAssetPublic, Paginated } from "@/lib/api/types";
import type { LiveStreamPublic, VideoPublic, VideoSectionPublic } from "./types";

/**
 * Reading the video system's three public endpoints.
 *
 * -- How a broadcast appears and disappears within a minute ----------------
 *
 * There is no cron, no polling and no YouTube Data API — all three are out of
 * scope by decision. Instead:
 *
 * - The API evaluates "is a broadcast running" on every read, comparing
 *   `expectedEndAt` to the clock. A broadcast whose time has passed simply
 *   stops being returned, whether or not anyone pressed end.
 * - These reads are cached for 60 seconds (`PUBLIC_REVALIDATE_SECONDS`), so
 *   the site follows the API within that window in both directions: an editor
 *   starting a broadcast sees it live within a minute, and ending one — by
 *   hand or by the clock — takes it off within a minute.
 *
 * That is the whole mechanism, and 60 seconds is exactly the budget the brief
 * set. The `videos` / `live-stream` tags are for the invalidation bridge that
 * would make it instant; see `public-client.ts` for why that does not exist.
 */

export const VIDEO_TAGS = ["videos"] as const;
export const LIVE_TAGS = ["live-stream", "videos"] as const;

/** The homepage section in one read: its texts, the featured video or the
 *  running broadcast, and the carousel. */
export const loadVideoSection = async (): Promise<VideoSectionPublic | null> =>
  fetchPublic<VideoSectionPublic>("/video-section/public", LIVE_TAGS);

export const loadActiveLiveStream = async (): Promise<LiveStreamPublic | null> =>
  fetchPublic<LiveStreamPublic | null>("/live-streams/public/active", LIVE_TAGS);

export const loadVideoPage = async (query: string): Promise<Paginated<VideoPublic> | null> =>
  fetchPublic<Paginated<VideoPublic>>(`/videos/public${query ? `?${query}` : ""}`, VIDEO_TAGS);

/**
 * The API's own ceiling on one public read (`videos.service.ts`).
 *
 * It CLAMPS rather than refusing: asking for 200 returns 48 and a 200 status.
 * That silence is exactly why this constant is restated here — a caller that
 * assumed it got what it asked for would show a reader 48 rows, tell them
 * there are more, and then add nothing when they pressed for them.
 */
const MAX_PUBLIC_LIMIT = 48;

/**
 * Everything up to the reader's current depth, in as few reads as possible.
 *
 * The library appends rather than pages: pressing "show more" shows rows 1-24,
 * not rows 13-24. So the page asks for `wanted` rows from the top, and one
 * request covers that until `wanted` passes the ceiling above — at which point
 * this walks the pages rather than silently receiving a short list. A reader
 * who has pressed four times or fewer (48 rows) still costs exactly one read.
 */
export const loadVideoLibrary = async (
  queryFor: (page: number, limit: number) => string,
  wanted: number,
): Promise<Paginated<VideoPublic>> => {
  // One size for the whole run. The API paginates by `(page - 1) * limit`, so
  // a second read with a smaller limit would return rows 13-24 rather than
  // 49-60 — the arithmetic only lines up while every read agrees on the size.
  // Below the ceiling that size is simply `wanted`, so the common case (one
  // page, twelve rows) asks for twelve rather than forty-eight.
  const size = Math.min(wanted, MAX_PUBLIC_LIMIT);
  const reads = Math.max(1, Math.ceil(wanted / size));
  const pages = await Promise.all(
    Array.from({ length: reads }, (_, index) => loadVideoPage(queryFor(index + 1, size))),
  );

  // A failed read anywhere in the run means the list is incomplete, and an
  // incomplete list with a "show more" under it invites a reader to press for
  // rows that are already missing above. The first page is what they get.
  const first = pages[0];
  if (!first) return { items: [], total: 0, page: 1, limit: wanted };

  return {
    items: pages.flatMap((entry) => entry?.items ?? []).slice(0, wanted),
    total: first.total,
    page: 1,
    limit: wanted,
  };
};

/**
 * The stills for a set of videos, in one batched read.
 *
 * Every surface resolves them together rather than per card: the ids are
 * `mediaAssets` references, and twelve cards resolving individually would be
 * twelve round trips before first paint.
 */
export const loadThumbnails = async (
  videos: readonly { thumbnailId: string | null }[],
): Promise<Map<string, MediaAssetPublic>> => fetchPublicMedia(videos.map((video) => video.thumbnailId));
