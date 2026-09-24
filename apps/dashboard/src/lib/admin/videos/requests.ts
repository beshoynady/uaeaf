import { isMongoId } from "@/lib/admin/request-shapes";
import { VIDEO_CATEGORIES, VIDEO_KINDS, VIDEO_PLATFORMS } from "./types";
import type { VideoCategory, VideoKind, VideoPlatform } from "./types";

/**
 * Body guards for the video route handlers.
 *
 * The API validates everything again — these exist so a malformed body is
 * refused before it costs a round trip, and so the handler forwards a known
 * shape rather than whatever arrived. Only the fields a screen actually sends
 * are carried through: a body with extra keys loses them here rather than
 * being argued about upstream.
 */

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const inList = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/** A title pair. Arabic must carry something; English may be empty, because a
 *  federation publishing in Arabic first should not be blocked on a
 *  translation it has not written yet. */
const titlePair = (value: unknown): { ar: string; en: string } | null => {
  const pair = object(value);
  if (!pair) return null;
  const { ar, en } = pair;
  if (typeof ar !== "string" || ar.trim().length === 0) return null;
  if (typeof en !== "string") return null;
  return { ar: ar.trim(), en: en.trim() };
};

/** Venue is optional everywhere, so an absent one is a success with `null`. */
const optionalPair = (value: unknown): { ar: string; en: string } | null => {
  const pair = object(value);
  if (!pair) return null;
  const { ar, en } = pair;
  return typeof ar === "string" && typeof en === "string" ? { ar: ar.trim(), en: en.trim() } : null;
};

/** `<ownerType>:<id>` — the one string the API's association filter reads. */
const association = (value: unknown): { ownerType: string; ownerId: string } | null => {
  if (typeof value !== "string") return null;
  const [ownerType, ownerId] = value.split(":");
  return inList(["championships", "sportsEvents", "publicEvents"] as const, ownerType) && isMongoId(ownerId)
    ? { ownerType, ownerId }
    : null;
};

const isoDate = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;

export type Parsed<T> = { ok: true; body: T } | { ok: false };

/**
 * What `POST /videos` accepts, and what it does not.
 *
 * The API creates every video as a **draft**: `CreateVideoDto` carries no
 * `status` and no `publishedAt`, and its ValidationPipe refuses a body that
 * has them (verified against a running API, 2026-09-23 —
 * `"property status should not exist"`). Publishing is a transition, made by
 * `PATCH`, and the service stamps `publishedAt` on the draft-to-published
 * move.
 *
 * So the drawer's two buttons are the same create followed by nothing, or the
 * same create followed by one patch. The split is expressed here, in the
 * parsed shape, rather than being remembered at the call site.
 */
export interface VideoBody {
  /** Exactly the fields `POST /videos` takes. */
  create: {
    title: { ar: string; en: string };
    category: VideoCategory;
    kind: VideoKind;
    externalPlatform: VideoPlatform;
    externalUrl: string;
    externalId: string;
    associations?: { ownerType: string; ownerId: string }[];
  };
  /** The transition to make afterwards, or `null` for a draft. */
  publish: { status: "published"; publishedAt?: string } | null;
}

export const readVideoBody = (value: unknown): Parsed<VideoBody> => {
  const raw = object(value);
  if (!raw) return { ok: false };

  const title = titlePair(raw.title);
  if (!title) return { ok: false };
  if (!inList(VIDEO_CATEGORIES, raw.category)) return { ok: false };
  if (!inList(VIDEO_KINDS, raw.kind)) return { ok: false };
  if (!inList(VIDEO_PLATFORMS, raw.externalPlatform)) return { ok: false };
  if (typeof raw.externalUrl !== "string" || raw.externalUrl.length === 0) return { ok: false };
  if (typeof raw.externalId !== "string" || raw.externalId.length === 0) return { ok: false };
  if (raw.status !== "draft" && raw.status !== "published") return { ok: false };

  const linked = association(raw.association);
  const publishedAt = isoDate(raw.publishedAt);

  return {
    ok: true,
    body: {
      create: {
        title,
        category: raw.category,
        kind: raw.kind,
        externalPlatform: raw.externalPlatform,
        externalUrl: raw.externalUrl,
        externalId: raw.externalId,
        // Sent only when there is one: an empty array would read upstream as a
        // deliberate "unlink everything".
        ...(linked ? { associations: [linked] } : {}),
      },
      publish:
        raw.status === "published"
          ? { status: "published", ...(publishedAt ? { publishedAt } : {}) }
          : null,
    },
  };
};

/** One video's editable fields. Every key is optional; an empty body is still
 *  valid and changes nothing, which is what a form that saved no edits should
 *  send. */
export interface VideoPatch {
  title?: { ar: string; en: string };
  category?: VideoCategory;
  status?: "draft" | "published";
  publishedAt?: string;
}

export const readVideoPatch = (value: unknown): Parsed<VideoPatch> => {
  const raw = object(value);
  if (!raw) return { ok: false };

  const patch: VideoPatch = {};
  if (raw.title !== undefined) {
    const title = titlePair(raw.title);
    if (!title) return { ok: false };
    patch.title = title;
  }
  if (raw.category !== undefined) {
    if (!inList(VIDEO_CATEGORIES, raw.category)) return { ok: false };
    patch.category = raw.category;
  }
  if (raw.status !== undefined) {
    if (raw.status !== "draft" && raw.status !== "published") return { ok: false };
    patch.status = raw.status;
  }
  if (raw.publishedAt !== undefined) {
    const at = isoDate(raw.publishedAt);
    if (!at) return { ok: false };
    patch.publishedAt = at;
  }
  return { ok: true, body: patch };
};

/** The resolve request. The URL is not validated beyond being a string — the
 *  API owns the allowlist, and a second copy of it here would be a second
 *  thing to keep in step with the platforms. */
export const readResolveBody = (value: unknown): Parsed<{ url: string }> => {
  const raw = object(value);
  return raw && typeof raw.url === "string" && raw.url.length > 0 && raw.url.length <= 2048
    ? { ok: true, body: { url: raw.url } }
    : { ok: false };
};

export interface LiveStreamBody {
  url: string;
  title: { ar: string; en: string };
  venue?: { ar: string; en: string } | null;
  expectedEndAt: string;
  associations?: { ownerType: string; ownerId: string }[];
}

export const readLiveStreamBody = (value: unknown): Parsed<LiveStreamBody> => {
  const raw = object(value);
  if (!raw) return { ok: false };

  const title = titlePair(raw.title);
  if (!title) return { ok: false };
  if (typeof raw.url !== "string" || raw.url.length === 0) return { ok: false };
  const expectedEndAt = isoDate(raw.expectedEndAt);
  if (!expectedEndAt) return { ok: false };

  // An absent venue is a success with nothing; a present one that will not
  // parse is a refusal, not a silent drop of what the editor typed.
  const venueGiven = raw.venue !== null && raw.venue !== undefined;
  const venue = venueGiven ? optionalPair(raw.venue) : null;
  if (venueGiven && !venue) return { ok: false };
  const linked = association(raw.association);

  return {
    ok: true,
    body: {
      url: raw.url,
      title,
      expectedEndAt,
      ...(venue ? { venue } : {}),
      ...(linked ? { associations: [linked] } : {}),
    },
  };
};

/** Editing a running broadcast: its title, venue and end time, never its URL —
 *  changing the URL mid-broadcast would silently swap what visitors are
 *  watching. Starting a second broadcast is the way to do that, and it ends
 *  this one on the record. */
export const readLiveStreamPatch = (value: unknown): Parsed<Partial<Omit<LiveStreamBody, "url">>> => {
  const raw = object(value);
  if (!raw) return { ok: false };

  const patch: Partial<Omit<LiveStreamBody, "url">> = {};
  if (raw.title !== undefined) {
    const title = titlePair(raw.title);
    if (!title) return { ok: false };
    patch.title = title;
  }
  if (raw.venue !== undefined) {
    if (raw.venue === null) {
      patch.venue = null;
    } else {
      const venue = optionalPair(raw.venue);
      if (!venue) return { ok: false };
      patch.venue = venue;
    }
  }
  if (raw.expectedEndAt !== undefined) {
    const at = isoDate(raw.expectedEndAt);
    if (!at) return { ok: false };
    patch.expectedEndAt = at;
  }
  return { ok: true, body: patch };
};
