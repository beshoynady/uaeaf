import { Types } from 'mongoose';
import { seasonRange } from './season.js';
import type { VideoCategory, VideoExternalPlatform, VideoKind } from './schemas/video.schema.js';

/**
 * The public library's filter.
 *
 * Built as a plain object and kept out of the service so it can be tested as
 * one: every rule here is about which keys exist, and a database round trip
 * would test Mongoose instead.
 *
 * Two rules carry the weight:
 *
 * - **Only supplied fields become keys.** `{ category: undefined }` does not
 *   mean "any category" to Mongoose — it matches documents that LACK the
 *   field, which is the opposite. The same trap `AuditLogsService.buildFilter`
 *   documents.
 * - **A bad narrowing is ignored, not answered with nothing.** A hand-edited
 *   or stale query string should show the unfiltered library rather than an
 *   empty one, because an empty list reads to a visitor as "the federation has
 *   published nothing", which is a lie about the organisation.
 */

/** Escaped before it becomes a `RegExp`: an unescaped `.*` typed into a public
 *  search box is a collection scan any visitor can trigger at will. The same
 *  constant, for the same reason, as `articles.service.ts`. */
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * The owner types this filter offers, which is narrower than
 * `CONTENT_ASSOCIATION_OWNER_TYPES`.
 *
 * A video records associations to athletes and clubs too, but "every video
 * featuring this athlete" is a different product question from "every video
 * from this championship", and it is not one the library's filter bar asks.
 * Offering it here would ship a public query nothing in the design uses.
 */
export const VIDEO_ASSOCIATION_TYPES = ['championships', 'sportsEvents', 'publicEvents'] as const;
export type VideoAssociationType = (typeof VIDEO_ASSOCIATION_TYPES)[number];

/**
 * Read `<ownerType>:<id>` from a query string.
 *
 * None of the three owner collections is built yet, so the id cannot be
 * checked for existence — only for SHAPE. That is deliberate rather than a
 * gap: a video can already record which championship it belongs to, and
 * filtering by it now means the day that entity ships its page can list its
 * videos with no API change. An id that matches nothing simply returns an
 * empty list, which is the truthful answer.
 */
const parseAssociation = (value: string | undefined): { ownerType: string; ownerId: Types.ObjectId } | null => {
  if (!value) return null;

  const separator = value.indexOf(':');
  if (separator <= 0) return null;

  const ownerType = value.slice(0, separator);
  const ownerId = value.slice(separator + 1);

  if (!(VIDEO_ASSOCIATION_TYPES as readonly string[]).includes(ownerType)) return null;
  if (!Types.ObjectId.isValid(ownerId)) return null;

  return { ownerType, ownerId: new Types.ObjectId(ownerId) };
};

export interface PublicVideoQuery {
  kind?: VideoKind | string;
  platform?: VideoExternalPlatform | string;
  category?: VideoCategory | string;
  season?: string;
  search?: string;
  from?: string;
  to?: string;
  /** `<ownerType>:<id>` — e.g. `championships:66f0…`. */
  association?: string;
}

const parsedDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  // `new Date('yesterday')` is an Invalid Date, and comparing against one
  // silently matches nothing.
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
};

export const buildPublicVideoFilter = (query: PublicVideoQuery): Record<string, unknown> => {
  // Never negotiable, whatever the reader asked for: a draft is not public,
  // and a soft-deleted row is not either.
  const filter: Record<string, unknown> = { status: 'published', archivedAt: null };

  if (query.kind) filter.kind = query.kind;
  if (query.category) filter.category = query.category;
  // The query parameter is `platform`; the stored field is `externalPlatform`.
  if (query.platform) filter.externalPlatform = query.platform;

  // A season and an explicit window are the same axis. The window wins when
  // both arrive, because it is the more specific thing the reader chose.
  const from = parsedDate(query.from);
  const to = parsedDate(query.to);
  const windowIsPossible = !from || !to || from <= to;

  if ((from || to) && windowIsPossible) {
    filter.publishedAt = {
      ...(from ? { $gte: from } : {}),
      // `to` runs to the end of its day, or a video published that afternoon
      // falls outside a window the reader believes includes it.
      ...(to ? { $lte: endOfDay(to) } : {}),
    };
  } else if (query.season) {
    const range = seasonRange(query.season);
    // Half-open, matching `seasonRange`'s own contract: `$lt`, not `$lte`, so
    // a video published at midnight on 1 September belongs to one season only.
    if (range) filter.publishedAt = { $gte: range.from, $lt: range.to };
  }

  const association = parseAssociation(query.association);
  if (association) {
    // `$elemMatch`, not two dotted paths: `{ 'associations.ownerType': a,
    // 'associations.ownerId': b }` matches a video with SOME entry of type a
    // and SOME entry with id b, which need not be the same entry.
    filter.associations = { $elemMatch: association };
  }

  if (query.search) {
    const pattern = new RegExp(query.search.replace(REGEX_SPECIALS, '\\$&'), 'i');
    filter.$or = [{ 'title.ar': pattern }, { 'title.en': pattern }];
  }

  return filter;
};
