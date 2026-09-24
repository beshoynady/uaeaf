/**
 * The video vocabulary the public site reads.
 *
 * Mirrored from the API's own closed lists rather than imported: the site is a
 * separate application that talks to the API over HTTP, and importing across
 * that boundary would make a build-time dependency out of a runtime contract.
 * The enforcement is upstream, where the API answers 400 for anything else.
 */

export const VIDEO_PLATFORMS = ["youtube", "instagram", "tiktok", "x", "facebook"] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const VIDEO_KINDS = ["video", "reel"] as const;
export type VideoKind = (typeof VIDEO_KINDS)[number];

export const VIDEO_CATEGORIES = [
  "championships",
  "events",
  "interviews",
  "nationalTeam",
  "training",
] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export interface LocalizedText {
  ar: string;
  en: string;
}

/** One video as `GET /videos/public` returns it.
 *
 *  There is no duration and no view count, and there never will be: the oEmbed
 *  responses this system is built on carry neither, and the brief forbids
 *  showing a number the platform did not give us. */
export interface VideoPublic {
  id: string;
  title: LocalizedText;
  category: VideoCategory;
  kind: VideoKind;
  platform: VideoPlatform;
  url: string;
  externalId: string;
  thumbnailId: string | null;
  publishedAt: string | null;
  season: string | null;
  tags: string[];
}

/** The broadcast currently on the site, from `GET /live-streams/public/active`.
 *
 *  Absent the moment it ends, whether an editor pressed end or its expected
 *  end time simply passed -- the API evaluates that on read, so there is no
 *  cron and nothing here has to poll. */
export interface LiveStreamPublic {
  id: string;
  title: LocalizedText;
  venue: LocalizedText | null;
  videoId: string;
  url: string;
  startedAt: string;
  expectedEndAt: string;
  /** Stored when the broadcast started. Null when the platform named no
   *  picture — `VideoThumbnail` draws the federation's motif for that. */
  thumbnailId: string | null;
}

/** `GET /video-section/public` -- the homepage section in one read. */
export interface VideoSectionPublic {
  enabled: boolean;
  title: LocalizedText | null;
  subtitle: LocalizedText | null;
  live: LiveStreamPublic | null;
  featured: VideoPublic | null;
  carousel: { items: VideoPublic[] };
}

/** The reading language's title, falling back to the other rather than to
 *  nothing: a video with only an Arabic title is still a video an English
 *  reader can watch, and an empty card is worse than a card in one language. */
export const titleOf = (video: { title: LocalizedText }, locale: "ar" | "en"): string =>
  video.title[locale] || video.title.ar || video.title.en;

export const isReel = (video: { kind: VideoKind }): boolean => video.kind === "reel";
