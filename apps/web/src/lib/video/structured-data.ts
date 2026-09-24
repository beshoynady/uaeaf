import { titleOf } from "./types";
import type { LiveStreamPublic, VideoPublic } from "./types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * `VideoObject` and `BroadcastEvent` for the library.
 *
 * -- What is deliberately absent -------------------------------------------
 *
 * `duration`, `interactionStatistic` and `thumbnailUrl` for a video with no
 * stored still. The oEmbed responses this system is built on return neither a
 * duration nor a view count, and the brief forbids showing a number the
 * platform did not give us. Structured data is the same promise to a machine
 * that the page makes to a person: a plausible `PT3M` would be a fabricated
 * statement about the federation's content, published to Google.
 *
 * `uploadDate` is required by Google's video rich-result guidance and is the
 * one field a video can genuinely lack -- a draft has no publish date. Such a
 * video is not in the public list at all, so the case cannot arise here; the
 * guard is still written, because "cannot arise" has a way of changing.
 */

const absolute = (url: string, origin: string): string =>
  /^https?:\/\//i.test(url) ? url : `${origin.replace(/\/$/, "")}${url}`;

export const videoObject = (
  video: VideoPublic,
  thumbnail: MediaAssetPublic | undefined,
  locale: AppLocale,
  origin: string,
): Record<string, unknown> | null => {
  if (!video.publishedAt) return null;

  return {
    "@type": "VideoObject",
    name: titleOf(video, locale),
    uploadDate: video.publishedAt,
    // Each video's OWN address, which opens the player on it. Giving every
    // VideoObject on the page one shared `url` tells a search engine that
    // twelve different videos all live at the same place, and it has to pick;
    // `?video=<id>` is a real address a reader can open, so it is the honest
    // one to publish.
    url: `${origin}/${locale}/media/videos?video=${encodeURIComponent(video.id)}`,
    embedUrl: video.url,
    ...(thumbnail ? { thumbnailUrl: absolute(thumbnail.file.url, origin) } : {}),
  };
};

/**
 * The running broadcast.
 *
 * `isLiveBroadcast: true` and an `endDate` are what let a search engine show
 * the LIVE badge and know when to stop. `endDate` is `expectedEndAt`, which is
 * exactly what it means: the editor's estimate, and the moment the site itself
 * stops treating the broadcast as running.
 */
export const broadcastEvent = (
  live: LiveStreamPublic,
  locale: AppLocale,
  origin: string,
): Record<string, unknown> => ({
  "@type": "BroadcastEvent",
  name: titleOf(live, locale),
  isLiveBroadcast: true,
  startDate: live.startedAt,
  endDate: live.expectedEndAt,
  url: `${origin}/${locale}/media/videos`,
  videoFormat: "HD",
  ...(live.venue
    ? { location: { "@type": "Place", name: live.venue[locale] || live.venue.ar } }
    : {}),
});

/** One graph for the page, rather than a script tag per video: a page with
 *  twenty separate JSON-LD blocks is twenty parses and no relationship between
 *  them. */
export const libraryGraph = (
  videos: readonly VideoPublic[],
  thumbnails: Map<string, MediaAssetPublic>,
  live: LiveStreamPublic | null,
  locale: AppLocale,
  origin: string,
): { "@context": string; "@graph": Record<string, unknown>[] } => ({
  "@context": "https://schema.org",
  "@graph": [
    ...(live ? [broadcastEvent(live, locale, origin)] : []),
    ...videos
      .map((video) => videoObject(video, video.thumbnailId ? thumbnails.get(video.thumbnailId) : undefined, locale, origin))
      .filter((entry): entry is Record<string, unknown> => entry !== null),
  ],
});
