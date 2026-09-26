import { ALBUM_STATES } from "./types";
import type { AdminAlbum, AlbumPhoto, AlbumState, LocalizedText } from "./types";

/**
 * Whatever the API answered, as the shapes the album screens read.
 *
 * `GET /albums` and `GET /albums/:id` return raw Mongoose documents — `_id`,
 * ObjectIds serialised as strings, dates as ISO strings — and `media-assets`
 * does the same. Tolerant in the way `toAdminVideo` is: one malformed field
 * must not take the whole screen down, so anything unreadable reads as absent,
 * and a row with no usable id is dropped rather than drawn with a dead link.
 */

type Row = Record<string, unknown>;

const object = (value: unknown): Row | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Row) : null;

const idOf = (row: Row): string | null =>
  typeof row.id === "string" ? row.id : typeof row._id === "string" ? row._id : null;

const optionalId = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** A pair when the API stored one, `null` when it stored nothing. A pair with
 *  both halves empty is also nothing — it would render as a blank. */
const pair = (value: unknown): LocalizedText | null => {
  const raw = object(value);
  if (!raw) return null;
  const result = { ar: text(raw.ar), en: text(raw.en) };
  return result.ar === "" && result.en === "" ? null : result;
};

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const when = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

const state = (value: unknown): AlbumState =>
  (ALBUM_STATES as readonly unknown[]).includes(value) ? (value as AlbumState) : "Draft";

export const toAdminAlbum = (raw: unknown): AdminAlbum | null => {
  const row = object(raw);
  if (!row) return null;
  const id = idOf(row);
  if (!id) return null;

  return {
    id,
    title: pair(row.title) ?? { ar: "", en: "" },
    slug: text(row.slug),
    description: pair(row.description),
    seasonId: optionalId(row.seasonId),
    championshipId: optionalId(row.championshipId),
    competitionId: optionalId(row.competitionId),
    publicEventId: optionalId(row.publicEventId),
    athleteIds: ids(row.athleteIds),
    clubIds: ids(row.clubIds),
    eventDate: when(row.eventDate),
    location: pair(row.location),
    isFeatured: row.isFeatured === true,
    championshipName: pair(row.championshipName),
    coverImageId: optionalId(row.coverImageId),
    displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : 0,
    publicationState: state(row.publicationState),
    tags: ids(row.tags),
    assetCount: typeof row.assetCount === "number" && row.assetCount >= 0 ? row.assetCount : 0,
    publishedAt: when(row.publishedAt),
  };
};

export const toAdminAlbumList = (raw: unknown): AdminAlbum[] =>
  Array.isArray(raw) ? raw.flatMap((entry) => toAdminAlbum(entry) ?? []) : [];

/**
 * One media asset as a photo of the grid.
 *
 * Only images: an asset whose file is not an image cannot be drawn in a photo
 * grid and cannot become a cover (`assertUsableImage` refuses it), so showing
 * it would offer actions that fail.
 */
export const toAlbumPhoto = (raw: unknown): AlbumPhoto | null => {
  const row = object(raw);
  if (!row) return null;
  const id = idOf(row);
  const file = object(row.file);
  if (!id || !file || typeof file.url !== "string") return null;
  if (typeof file.mimeType === "string" && !file.mimeType.startsWith("image/")) return null;

  return {
    id,
    url: file.url,
    altText: pair(row.altText) ?? { ar: "", en: "" },
    caption: pair(row.caption) ?? { ar: "", en: "" },
    displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : 0,
    photographer: typeof file.photographer === "string" && file.photographer !== "" ? file.photographer : null,
    captureDate: when(file.captureDate),
    isVisible: row.isVisible !== false,
  };
};

/**
 * The photos of one album, in the order the album shows them.
 *
 * `GET /media-assets` returns the whole library, so the album is picked out
 * here by `albumId`. Sorted by `displayOrder` with the id as a tie-break: two
 * photos can share a position after an interrupted upload, and a grid whose
 * order changes between two reads is one an editor cannot arrange.
 */
export const toAlbumPhotos = (raw: unknown, albumId: string): AlbumPhoto[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => object(entry)?.albumId === albumId)
    .flatMap((entry) => toAlbumPhoto(entry) ?? [])
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
};
