import { SEASON_PHASE_TYPES, SEASON_STATES } from "./types";
import type { AdminSeason, SeasonKeyDate, SeasonPhase, SeasonSeo, SeasonState } from "./types";
import type { LocalizedText } from "@/lib/api/types";

/**
 * Whatever the API answered, as the shape the season screens read.
 *
 * `GET /seasons` and `GET /seasons/:id` return raw Mongoose documents: `_id`,
 * ObjectIds serialised as strings, dates as ISO strings. Tolerant in the way
 * `toAdminAlbum` is — one malformed field must not take the whole screen
 * down, so anything unreadable reads as absent, and a row with no usable id is
 * dropped rather than drawn with a dead link.
 */

type Row = Record<string, unknown>;

const object = (value: unknown): Row | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Row) : null;

const idOf = (row: Row): string | null =>
  typeof row.id === "string" ? row.id : typeof row._id === "string" ? row._id : null;

const optionalId = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** A pair when the API stored one, `null` when it stored nothing or both
 *  halves are empty — which would render as a blank. */
const pair = (value: unknown): LocalizedText | null => {
  const raw = object(value);
  if (!raw) return null;
  const result = { ar: text(raw.ar), en: text(raw.en) };
  return result.ar === "" && result.en === "" ? null : result;
};

const when = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry !== "") : [];

const state = (value: unknown): SeasonState =>
  (SEASON_STATES as readonly unknown[]).includes(value) ? (value as SeasonState) : "Draft";

/** A phase missing any of its four parts cannot be placed on a timeline, so
 *  it is dropped rather than drawn at a guessed position. */
const phases = (value: unknown): SeasonPhase[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const row = object(entry);
        const name = row ? pair(row.name) : null;
        const from = row ? when(row.from) : null;
        const to = row ? when(row.to) : null;
        const type = row?.type;
        if (!row || !name || !from || !to || !(SEASON_PHASE_TYPES as readonly unknown[]).includes(type)) return [];
        return [{ name, type: type as SeasonPhase["type"], from, to }];
      })
    : [];

const keyDates = (value: unknown): SeasonKeyDate[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const row = object(entry);
        const title = row ? pair(row.title) : null;
        const date = row ? when(row.date) : null;
        return row && title && date ? [{ title, date }] : [];
      })
    : [];

const seo = (value: unknown): SeasonSeo => {
  const row = object(value);
  return {
    metaTitle: row ? pair(row.metaTitle) : null,
    metaDescription: row ? pair(row.metaDescription) : null,
    ogImageId: row ? optionalId(row.ogImageId) : null,
  };
};

export const toAdminSeason = (raw: unknown): AdminSeason | null => {
  const row = object(raw);
  if (!row) return null;
  const id = idOf(row);
  const startDate = when(row.startDate);
  const endDate = when(row.endDate);
  // A season without its range cannot be listed, checked for overlap or
  // shown on the public timeline; the row is unusable rather than partial.
  if (!id || !startDate || !endDate) return null;

  return {
    id,
    name: pair(row.name) ?? { ar: "", en: "" },
    shortName: text(row.shortName),
    slug: text(row.slug),
    tagline: pair(row.tagline),
    logoId: optionalId(row.logoId),
    bannerId: optionalId(row.bannerId),
    shareImageId: optionalId(row.shareImageId),
    about: pair(row.about) ?? { ar: "", en: "" },
    closingSummary: pair(row.closingSummary),
    startDate,
    endDate,
    phases: phases(row.phases),
    keyDates: keyDates(row.keyDates),
    calendarDocumentId: optionalId(row.calendarDocumentId),
    documentIds: ids(row.documentIds),
    isCurrent: row.isCurrent === true,
    publicationState: state(row.publicationState),
    publishedAt: when(row.publishedAt),
    isVisible: row.isVisible === true,
    seo: seo(row.seo),
    updatedAt: when(row.updatedAt),
  };
};

export const toAdminSeasonList = (raw: unknown): AdminSeason[] =>
  Array.isArray(raw) ? raw.flatMap((entry) => toAdminSeason(entry) ?? []) : [];
