import { Types } from 'mongoose';
import type { QueryFilter } from 'mongoose';
import { seasonRange } from '../videos/season.js';
import type { AlbumDocument } from './schemas/album.schema.js';

/**
 * The public gallery's filter.
 *
 * Built as a plain object and kept out of the service so it can be tested as
 * one: every rule here is about which keys exist, and a database round trip
 * would test Mongoose instead.
 *
 * Two rules carry the weight, the same two `videos.public-filter.ts` states:
 *
 * - **Only supplied fields become keys.** `{ seasonId: undefined }` does not
 *   mean "any season" to Mongoose — it matches documents that LACK the field,
 *   which is the opposite.
 * - **A bad narrowing is ignored, not answered with nothing.** A hand-edited
 *   or stale query string shows the unfiltered gallery rather than an empty
 *   one, because an empty list reads to a visitor as "the federation has
 *   published nothing", which is a lie about the organisation.
 *
 * The one deliberate exception is an inverted date range. That is not a
 * malformed value the visitor never chose — they asked for a window with no
 * days in it, and the truthful answer is that it holds no albums.
 */

/** Escaped before it becomes a `RegExp`, so a visitor's search term is matched
 *  literally instead of being run as a pattern. That stops a crafted term like
 *  `(a+)+$` from costing far more than its length suggests; it does NOT stop
 *  the collection scan — an unanchored case-insensitive search cannot use an
 *  index, and every search scans the published set either way. The same
 *  constant, for the same reason, as `articles.service.ts`. */
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

export interface AlbumFilterQuery {
  /** A season label such as `2025–2026`, not an id — this platform derives a
   *  season from a date and adds no season entity (`videos/season.ts`). The
   *  same shape the video library's `season` parameter takes. */
  season?: string;
  championship?: string;
  competition?: string;
  publicEvent?: string;
  athlete?: string;
  club?: string;
  from?: string;
  to?: string;
  q?: string;
}

/** An id, or `undefined` when it is absent or malformed. */
const objectId = (value: string | undefined): Types.ObjectId | undefined =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;

/** A date, or `undefined` when it is absent or unparseable. */
const date = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/** The last instant of a day. `to` is documented as inclusive, and a bare date
 *  parses to midnight — without this, "to 30 June" excludes everything that
 *  happened on 30 June. The same pairing as `videos.public-filter.ts`. */
const endOfDay = (value: Date): Date => {
  const end = new Date(value);
  end.setUTCHours(23, 59, 59, 999);
  return end;
};

export const buildAlbumFilter = (query: AlbumFilterQuery): QueryFilter<AlbumDocument> => {
  const filter: QueryFilter<AlbumDocument> = { publicationState: 'Published', archivedAt: null };

  // A season is a range over `eventDate`, resolved by the same helper the
  // video library uses — one definition of where a season starts, not two.
  // Half-open, matching `seasonRange`'s own contract: an album dated exactly
  // at the boundary belongs to one season only.
  const season = query.season ? seasonRange(query.season) : null;
  if (season) {
    filter.eventDate = { $gte: season.from, $lt: season.to };
  }

  // No `$or` reaching down the tree: an album of a competition carries its
  // championship as well, because the editor stated every level. That is the
  // whole reason the levels are explicit rather than derived.
  const championship = objectId(query.championship);
  if (championship) filter.championshipId = championship;

  const competition = objectId(query.competition);
  if (competition) filter.competitionId = competition;

  const publicEvent = objectId(query.publicEvent);
  if (publicEvent) filter.publicEventId = publicEvent;

  // Multikey fields: a bare id matches any array containing it.
  const athlete = objectId(query.athlete);
  if (athlete) filter.athleteIds = athlete;

  const club = objectId(query.club);
  if (club) filter.clubIds = club;

  // An explicit range wins over a season: the visitor named exact dates, which
  // is more specific than naming the year they fall in. Written as a replace
  // rather than a merge, so the two cannot combine into a range neither asked
  // for.
  const from = date(query.from);
  const to = date(query.to);
  if (from || to) {
    filter.eventDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: endOfDay(to) } : {}) };
  }

  const term = query.q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(REGEX_SPECIALS, '\\$&'), 'i');
    filter.$or = [
      { 'title.ar': pattern },
      { 'title.en': pattern },
      { 'location.ar': pattern },
      { 'location.en': pattern },
    ];
  }

  return filter;
};
