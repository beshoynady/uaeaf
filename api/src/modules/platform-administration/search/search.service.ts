import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { normalizeArabic } from './arabic-normalize.js';
import { buildSearchSources, SEARCH_SOURCE_KEYS } from './search-sources.js';
import type { SearchSource, SearchSourceKey } from './search-sources.js';
import { Article } from '../../public-communication/articles/schemas/article.schema.js';
import type { ArticleDocument } from '../../public-communication/articles/schemas/article.schema.js';
import { Album } from '../../media-center/albums/schemas/album.schema.js';
import type { AlbumDocument } from '../../media-center/albums/schemas/album.schema.js';
import { Video } from '../../media-center/videos/schemas/video.schema.js';
import type { VideoDocument } from '../../media-center/videos/schemas/video.schema.js';
import { Club } from '../../people-organizations/clubs/schemas/club.schema.js';
import type { ClubDocument } from '../../people-organizations/clubs/schemas/club.schema.js';
import { Athlete } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import type { AthleteDocument } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import { AthleteProfile } from '../../people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';
import type { AthleteProfileDocument } from '../../people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';
import { Coach } from '../../people-organizations/coaches/schemas/coach.schema.js';
import type { CoachDocument } from '../../people-organizations/coaches/schemas/coach.schema.js';

export type SearchLocale = 'ar' | 'en';

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  thumbnailId: string | null;
}

export interface SearchGroup {
  type: SearchSourceKey;
  total: number;
  items: SearchHit[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}

/** A reader has typed nothing worth a database round trip below this. */
const MIN_QUERY_LENGTH = 2;
/** `$text` treats the term as words regardless of length; this bounds the
 *  string itself, not what it can do. */
const MAX_QUERY_LENGTH = 80;
/** "Show more" raises `limit` up to here — the `videos.service.ts` clamp,
 *  not a rejection: `?limit=999` gets 10 results, not a 400. */
const MAX_LIMIT = 10;
const DEFAULT_LIMIT = 5;
/** How many raw matches a cross-collection source (`resolvePublicRows`) may
 *  scan to produce an accurate `total` — bounded so a popular term cannot
 *  force scanning an entire collection purely to produce a count. */
const MAX_JOIN_SCAN = 200;

const otherLocale = (locale: SearchLocale): SearchLocale => (locale === 'ar' ? 'en' : 'ar');

/** A bilingual field read off a plain (lean) row, tolerant of a missing or
 *  malformed value rather than throwing on one bad document. */
const localized = (row: Record<string, unknown>, path: string): Partial<Record<SearchLocale, string>> => {
  const value = row[path];
  return value && typeof value === 'object' ? (value as Record<SearchLocale, string>) : {};
};

/**
 * Site-wide search over the sources registered in `search-sources.ts`.
 *
 * The query string reaches Mongo only inside `$text.$search`: that operator
 * takes a string and matches it as words, so a caller-supplied `$ne` or
 * `.*` is a word that matches nothing rather than an operator that runs. It
 * is never used to build a `$regex` and never spread into a filter object.
 */
@Injectable()
export class SearchService {
  private readonly sources: readonly SearchSource[];

  constructor(
    @InjectModel(Article.name) articleModel: Model<ArticleDocument>,
    @InjectModel(Album.name) albumModel: Model<AlbumDocument>,
    @InjectModel(Video.name) videoModel: Model<VideoDocument>,
    @InjectModel(Club.name) clubModel: Model<ClubDocument>,
    @InjectModel(Athlete.name) athleteModel: Model<AthleteDocument>,
    @InjectModel(AthleteProfile.name) athleteProfileModel: Model<AthleteProfileDocument>,
    @InjectModel(Coach.name) coachModel: Model<CoachDocument>,
  ) {
    this.sources = buildSearchSources({
      articleModel,
      albumModel,
      videoModel,
      clubModel,
      athleteModel,
      athleteProfileModel,
      coachModel,
    });
  }

  /**
   * One term across every requested (or, absent `types`, every registered)
   * source. A source that throws drops only its own group — a search box
   * that returns five groups instead of six still works; one that 500s
   * because an unrelated collection was slow does not.
   */
  async search(
    q: string,
    locale: SearchLocale,
    types: readonly string[] | undefined,
    limit: number,
  ): Promise<SearchResponse> {
    const term = normalizeArabic(q).slice(0, MAX_QUERY_LENGTH);
    if (term.length < MIN_QUERY_LENGTH) return { groups: [] };

    const perType = Math.min(Math.max(Math.floor(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const requested = types && types.length > 0 ? new Set(types) : null;
    // An unrecognised value in `requested` simply matches no source below —
    // it is never rejected and never affects the sources that ARE known.
    const wanted = requested ? this.sources.filter((source) => requested.has(source.key)) : this.sources;

    const settled = await Promise.allSettled(wanted.map((source) => this.readSource(source, term, locale, perType)));

    return {
      groups: settled
        .filter(
          (result): result is PromiseFulfilledResult<SearchGroup> =>
            result.status === 'fulfilled' && result.value.items.length > 0,
        )
        .map((result) => result.value),
    };
  }

  private async readSource(
    source: SearchSource,
    term: string,
    locale: SearchLocale,
    limit: number,
  ): Promise<SearchGroup> {
    const filter = { ...source.publicFilter, $text: { $search: term } };

    // `total` must count exactly the set `items` is sliced from — never a
    // wider one. A source with no `resolvePublicRows` has none of this
    // problem: `model` IS the public row, so `countDocuments(filter)` counts
    // precisely what the `find(filter)` above it can return, independent of
    // `limit`. A source WITH `resolvePublicRows` (only `athletes` today) is
    // exactly the shape that can diverge — a raw match is not yet a public
    // row — so it is counted after the join, from the same resolved array
    // `items` comes from, never from a count taken before the join. Anything
    // else would let a caller learn, from the number alone, that a
    // non-public row exists (a Guest athlete, or one with an archived
    // profile) without ever seeing a field of theirs.
    if (source.resolvePublicRows) {
      const matches = await source.model
        .find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(MAX_JOIN_SCAN)
        .lean()
        .exec();
      const rows = await source.resolvePublicRows(matches);
      const items = rows
        .slice(0, limit)
        .map((row) => this.toHit(source, row, locale))
        .filter((hit): hit is SearchHit => hit !== null);

      return { type: source.key, total: rows.length, items };
    }

    const [matches, total] = await Promise.all([
      source.model
        .find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean()
        .exec(),
      source.model.countDocuments(filter).exec(),
    ]);

    const items = matches.map((row) => this.toHit(source, row, locale)).filter((hit): hit is SearchHit => hit !== null);

    return { type: source.key, total, items };
  }

  private toHit(source: SearchSource, row: Record<string, unknown>, locale: SearchLocale): SearchHit | null {
    const href = source.hrefOf(row);
    if (!href) return null;

    const title = localized(row, source.titlePath);
    // The requested language, else the other — half a result beats none.
    const text = title[locale] || title[otherLocale(locale)];
    if (!text) return null;

    const subtitleField = source.subtitlePath ? localized(row, source.subtitlePath) : null;
    const subtitle = subtitleField ? subtitleField[locale] || subtitleField[otherLocale(locale)] || null : null;

    const thumbnail = source.thumbnailPath ? row[source.thumbnailPath] : null;

    return {
      id: String(row._id ?? ''),
      title: text,
      subtitle,
      href,
      thumbnailId: thumbnail ? String(thumbnail) : null,
    };
  }
}

export { SEARCH_SOURCE_KEYS };
