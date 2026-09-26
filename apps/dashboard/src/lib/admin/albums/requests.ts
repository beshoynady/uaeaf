import { isLocalizedText, isMongoId, isMongoIdList } from "@/lib/admin/request-shapes";
import { SLUG_PATTERN } from "@/lib/admin/articles";
import { CREATABLE_ALBUM_STATES } from "./types";

/**
 * Body guards for the album route handlers.
 *
 * The API validates everything again. These exist so a malformed body is
 * refused before it costs a round trip, and so a handler forwards only the
 * fields the API accepts: `forbidNonWhitelisted` refuses a whole request over
 * one stray key, which would fail a save with nothing on screen to say why.
 *
 * -- Two steps travel beside the write --------------------------------------
 *
 * Publishing and featuring are separate upstream routes (`:id/publish`, behind
 * its own permission, and `:id/featured`, which clears the previous holder).
 * The form asks for them with two booleans beside the album body, and the
 * handler makes the calls in order on the server — the same arrangement the
 * video create uses, so the browser never has to remember a second request.
 */

export type Parsed<T> = { ok: true; body: T } | { ok: false };

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const isInstant = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

const AFFILIATION_FIELDS = ["seasonId", "championshipId", "competitionId", "publicEventId"] as const;
const OPTIONAL_PAIRS = ["description", "location", "championshipName"] as const;

export interface AlbumWriteBody {
  album: Record<string, unknown>;
  publish: boolean;
  feature: boolean;
}

/** Shared by both shapes: the fields a create and a patch describe alike. */
const readCommon = (raw: Record<string, unknown>, nullable: boolean): Record<string, unknown> | null => {
  const album: Record<string, unknown> = {};

  if (!isLocalizedText(raw.title)) return null;
  album.title = raw.title;

  for (const key of OPTIONAL_PAIRS) {
    const value = raw[key];
    if (value === undefined) continue;
    // Only `location` may be cleared on a patch; the DTO declares the other
    // two optional but not nullable.
    if (value === null && nullable && key === "location") {
      album[key] = null;
      continue;
    }
    if (!isLocalizedText(value)) return null;
    album[key] = value;
  }

  if (raw.eventDate !== undefined) {
    if (raw.eventDate === null && nullable) album.eventDate = null;
    else if (isInstant(raw.eventDate)) album.eventDate = raw.eventDate;
    else return null;
  }

  for (const key of AFFILIATION_FIELDS) {
    const value = raw[key];
    if (value === undefined) continue;
    if (value === null && nullable) album[key] = null;
    else if (isMongoId(value)) album[key] = value;
    else return null;
  }

  for (const key of ["athleteIds", "clubIds"] as const) {
    if (raw[key] === undefined) continue;
    if (!isMongoIdList(raw[key])) return null;
    album[key] = raw[key];
  }

  return album;
};

const flags = (raw: Record<string, unknown>) => ({
  publish: raw.publish === true,
  feature: raw.feature === true,
});

/** `POST /api/admin/albums`: `{ album: CreateAlbumDto, publish, feature }`. */
export const readCreateAlbum = (value: unknown): Parsed<AlbumWriteBody> => {
  const raw = object(value);
  const album = raw ? object(raw.album) : null;
  if (!raw || !album) return { ok: false };

  const common = readCommon(album, false);
  if (!common) return { ok: false };
  if (typeof album.slug !== "string" || !SLUG_PATTERN.test(album.slug)) return { ok: false };
  if (!(CREATABLE_ALBUM_STATES as readonly unknown[]).includes(album.publicationState)) return { ok: false };
  if (!Number.isInteger(album.displayOrder)) return { ok: false };

  return {
    ok: true,
    body: {
      album: {
        ...common,
        slug: album.slug,
        publicationState: album.publicationState,
        displayOrder: album.displayOrder,
      },
      ...flags(raw),
    },
  };
};

/** `PATCH /api/admin/albums/:id`: `{ album: UpdateAlbumDto, publish, feature }`.
 *  No `slug` and no `publicationState` — the DTO omits both on purpose. */
export const readPatchAlbum = (value: unknown): Parsed<AlbumWriteBody> => {
  const raw = object(value);
  const album = raw ? object(raw.album) : null;
  if (!raw || !album) return { ok: false };

  const common = readCommon(album, true);
  if (!common) return { ok: false };
  return { ok: true, body: { album: common, ...flags(raw) } };
};

/** The complete order of an album's photos. Duplicates are refused here: the
 *  API would answer 409 for them, and they can only come from a bug. */
export const readPhotoOrder = (value: unknown): Parsed<{ photoIds: string[] }> => {
  const raw = object(value);
  if (!raw || !isMongoIdList(raw.photoIds) || raw.photoIds.length === 0) return { ok: false };
  if (new Set(raw.photoIds).size !== raw.photoIds.length) return { ok: false };
  return { ok: true, body: { photoIds: raw.photoIds } };
};

export const readCover = (value: unknown): Parsed<{ photoId: string }> => {
  const raw = object(value);
  return raw && isMongoId(raw.photoId) ? { ok: true, body: { photoId: raw.photoId } } : { ok: false };
};
