import { isLocalizedText, isMongoId, isMongoIdList } from "@/lib/admin/request-shapes";
import { SLUG_PATTERN } from "@/lib/admin/articles";
import { CREATABLE_SEASON_STATES, SEASON_PHASE_TYPES } from "./types";

/**
 * Body guards for the season route handlers.
 *
 * The API validates everything again. These exist so a malformed body is
 * refused before it costs a round trip, and so a handler forwards only the
 * fields the API accepts: `forbidNonWhitelisted` refuses a whole request over
 * one stray key, which would fail a save with nothing on screen to say why.
 *
 * Mirrors `CreateSeasonDto` / `UpdateSeasonDto` / `PublishSeasonDto` field by
 * field. Not sent on an edit: `slug` (omitted by `UpdateSeasonDto`, it is the
 * public address) and `publicationState` (accepted by the DTO but ignored by
 * `SeasonsService.update`, so sending it would look like a state change that
 * never happens).
 */

export type Parsed<T> = { ok: true; body: T } | { ok: false };

type Row = Record<string, unknown>;

const object = (value: unknown): Row | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Row) : null;

const isInstant = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const isPhase = (value: unknown): boolean => {
  const row = object(value);
  return (
    row !== null &&
    Object.keys(row).every((key) => ["name", "type", "from", "to"].includes(key)) &&
    isLocalizedText(row.name) &&
    (SEASON_PHASE_TYPES as readonly unknown[]).includes(row.type) &&
    isInstant(row.from) &&
    isInstant(row.to)
  );
};

const isKeyDate = (value: unknown): boolean => {
  const row = object(value);
  return (
    row !== null &&
    Object.keys(row).every((key) => ["title", "date"].includes(key)) &&
    isLocalizedText(row.title) &&
    isInstant(row.date)
  );
};

/** `PageSeoDto`: three optional fields, each absent when empty. */
const readSeo = (value: unknown): Row | null => {
  const row = object(value);
  if (!row) return null;
  const seo: Row = {};
  for (const key of ["metaTitle", "metaDescription"] as const) {
    if (row[key] === undefined) continue;
    if (!isLocalizedText(row[key])) return null;
    seo[key] = row[key];
  }
  if (row.ogImageId !== undefined) {
    if (!isMongoId(row.ogImageId)) return null;
    seo.ogImageId = row.ogImageId;
  }
  return seo;
};

const OPTIONAL_PAIRS = ["tagline", "closingSummary"] as const;
const OPTIONAL_IDS = ["logoId", "bannerId", "shareImageId", "calendarDocumentId"] as const;

/** The fields a create and an edit describe alike. `nullable` is an edit,
 *  where `null` clears a stored value and absence leaves it. */
const readCommon = (raw: Row, nullable: boolean): Row | null => {
  const season: Row = {};

  if (!isLocalizedText(raw.name) || !isText(raw.shortName) || !isLocalizedText(raw.about)) return null;
  season.name = raw.name;
  season.shortName = raw.shortName.trim();
  season.about = raw.about;

  if (!isInstant(raw.startDate) || !isInstant(raw.endDate)) return null;
  season.startDate = raw.startDate;
  season.endDate = raw.endDate;

  for (const key of OPTIONAL_PAIRS) {
    const value = raw[key];
    if (value === undefined) continue;
    if (value === null && nullable) season[key] = null;
    else if (isLocalizedText(value)) season[key] = value;
    else return null;
  }

  for (const key of OPTIONAL_IDS) {
    const value = raw[key];
    if (value === undefined) continue;
    if (value === null && nullable) season[key] = null;
    else if (isMongoId(value)) season[key] = value;
    else return null;
  }

  if (raw.phases !== undefined) {
    if (!Array.isArray(raw.phases) || !raw.phases.every(isPhase)) return null;
    season.phases = raw.phases;
  }
  if (raw.keyDates !== undefined) {
    if (!Array.isArray(raw.keyDates) || !raw.keyDates.every(isKeyDate)) return null;
    season.keyDates = raw.keyDates;
  }
  if (raw.documentIds !== undefined) {
    if (!isMongoIdList(raw.documentIds)) return null;
    season.documentIds = raw.documentIds;
  }
  if (raw.isVisible !== undefined) {
    if (typeof raw.isVisible !== "boolean") return null;
    season.isVisible = raw.isVisible;
  }
  if (raw.seo !== undefined) {
    const seo = readSeo(raw.seo);
    if (!seo) return null;
    season.seo = seo;
  }

  return season;
};

/** `POST /api/admin/seasons`: a `CreateSeasonDto`. */
export const readCreateSeason = (value: unknown): Parsed<Row> => {
  const raw = object(value);
  if (!raw) return { ok: false };
  const common = readCommon(raw, false);
  if (!common) return { ok: false };
  if (typeof raw.slug !== "string" || !SLUG_PATTERN.test(raw.slug)) return { ok: false };
  if (!(CREATABLE_SEASON_STATES as readonly unknown[]).includes(raw.publicationState)) return { ok: false };
  return { ok: true, body: { ...common, slug: raw.slug, publicationState: raw.publicationState } };
};

/** `PATCH /api/admin/seasons/:id`: an `UpdateSeasonDto`, without `slug` or
 *  `publicationState` (see the file comment). */
export const readPatchSeason = (value: unknown): Parsed<Row> => {
  const raw = object(value);
  if (!raw) return { ok: false };
  const common = readCommon(raw, true);
  return common ? { ok: true, body: common } : { ok: false };
};

/** `PATCH /api/admin/seasons/:id/publish`: the version the editor read. */
export const readPublishSeason = (value: unknown): Parsed<{ expectedUpdatedAt: string }> => {
  const raw = object(value);
  return raw && isInstant(raw.expectedUpdatedAt)
    ? { ok: true, body: { expectedUpdatedAt: raw.expectedUpdatedAt } }
    : { ok: false };
};
