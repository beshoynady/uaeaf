/**
 * The video vocabulary, mirrored from the API's own closed lists.
 *
 * Restated here rather than imported: the dashboard is a separate application
 * that talks to the API over HTTP, and importing across that boundary would
 * make a build-time dependency out of a runtime contract. The
 * `token-lists-contract`-style guard for this is the API's own enums refusing
 * anything else with a 400.
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

export const VIDEO_STATUSES = ["draft", "published"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

/** The owner types a video may be linked to. Narrower than the API's full
 *  association list, which also carries athletes and clubs — those are not a
 *  question any video screen asks. */
export const VIDEO_ASSOCIATION_TYPES = ["championships", "sportsEvents", "publicEvents"] as const;
export type VideoAssociationType = (typeof VIDEO_ASSOCIATION_TYPES)[number];

export interface LocalizedText {
  ar: string;
  en: string;
}

/** A row as the admin list shows it. */
export interface AdminVideo {
  id: string;
  title: LocalizedText;
  category: VideoCategory;
  kind: VideoKind;
  platform: VideoPlatform;
  url: string;
  externalId: string;
  thumbnailId: string | null;
  status: VideoStatus;
  publishedAt: string | null;
}

/** What `POST /videos/resolve` answers. */
export type ResolvedVideo =
  | {
      platform: VideoPlatform;
      externalId: string;
      kind: VideoKind;
      title: string;
      thumbnailUrl: string | null;
    }
  | { fallback: true; platform: VideoPlatform; externalId: string; kind: VideoKind }
  | null;

export const isFallback = (
  resolved: ResolvedVideo,
): resolved is { fallback: true; platform: VideoPlatform; externalId: string; kind: VideoKind } =>
  resolved !== null && "fallback" in resolved;

export interface ActiveLiveStream {
  id: string;
  title: LocalizedText;
  venue: LocalizedText | null;
  videoId: string;
  url: string;
  startedAt: string;
  expectedEndAt: string;
  /** Stored when the broadcast started. Null when the platform named no
   *  picture — `VideoStill` draws the placeholder for that. */
  thumbnailId: string | null;
}

/** The same broadcast as the editor screens read it: three fields more than a
 *  visitor gets. `isActive` and `endedAt` are what let a finished broadcast
 *  say *how* it finished — ran past its time, or ended by hand — and
 *  `associations` rides along so "start a new one with the same details" can
 *  carry the event link rather than silently dropping it. */
export interface AdminLiveStream extends ActiveLiveStream {
  endedAt: string | null;
  isActive: boolean;
  /** The API's own verdict. `ended` deliberately does not say who ended it:
   *  ending one and being replaced by a newer one write the same fields. */
  state: LiveStreamState;
  associations: LiveStreamAssociation[];
}

export const LIVE_STREAM_STATES = ["live", "expired", "ended"] as const;
export type LiveStreamState = (typeof LIVE_STREAM_STATES)[number];

export interface LiveStreamAssociation {
  ownerType: VideoAssociationType;
  ownerId: string;
  role: "Primary" | "Featured" | "Related";
  displayOrder: number;
}
