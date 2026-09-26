import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import type { QueryFilter } from 'mongoose';
import { Album } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import type { MediaAssetDocument } from '../media-assets/schemas/media-asset.schema.js';
import { SEASON_START_MONTH, seasonLabel, seasonRange } from '../videos/season.js';

/** How many photos a gallery card shows. Three, because the card's stack has
 *  three layers; an album with fewer draws fewer. */
export const ALBUM_PREVIEW_PHOTOS = 3;

/** How many the homepage's lead album shows. Five, because `FeaturedAlbumDeck`
 *  has five slots and only turns when all five are filled — with fewer it
 *  draws at rest, which is a different component to the reader. */
export const ALBUM_DECK_PHOTOS = 5;

/** An album as the gallery list returns it: the document plus the photos its
 *  card draws. Not a `AlbumDocument` — it comes from an aggregation, so it is
 *  a plain object with no Mongoose methods. */
export type AlbumListRow = Album & { _id: Types.ObjectId; previewPhotos: MediaAssetDocument[] };

export interface AlbumFacetEntry {
  /** An ObjectId for an entity facet; a season label such as `2025–2026` for
   *  the season facet, which has no entity behind it. */
  id: string;
  count: number;
}

/** Published and not soft-deleted — what every public read starts from. */
const PUBLISHED = { publicationState: 'Published', archivedAt: null } as const;

export interface AlbumFacets {
  seasons: AlbumFacetEntry[];
  championships: AlbumFacetEntry[];
  competitions: AlbumFacetEntry[];
  publicEvents: AlbumFacetEntry[];
  athletes: AlbumFacetEntry[];
  clubs: AlbumFacetEntry[];
}

/**
 * One tier condition as an aggregation expression.
 *
 * `$match` and `$switch` do not speak the same language: the first takes a
 * query document, the second an expression. `{ athleteIds: { $in: [...] } }`
 * is a valid query and a meaningless expression, so each condition is
 * translated once here rather than written twice and left to drift.
 */
const matchExpression = (field: string, value: unknown): Record<string, unknown> => {
  if (value !== null && typeof value === 'object') {
    const operators = value as Record<string, unknown>;
    if ('$in' in operators) {
      // A multikey field: "any of the album's athletes appears in this one's".
      return { $gt: [{ $size: { $setIntersection: [`$${field}`, operators.$in] } }, 0] };
    }
    if ('$gte' in operators && '$lt' in operators) {
      // A half-open range, which is how "the same season" is expressed.
      return {
        $and: [{ $gte: [`$${field}`, operators.$gte] }, { $lt: [`$${field}`, operators.$lt] }],
      };
    }
  }
  return { $eq: [`$${field}`, value] };
};

/** Implements: albums collection, Domain 5 — Media Center. */
@Injectable()
export class AlbumsRepository extends BaseRepository<AlbumDocument> {
  constructor(@InjectModel(Album.name) model: Model<AlbumDocument>) {
    super(model);
  }

  /** The individual public album page's routing lookup: only a `Published`
   *  album resolves; a Draft/Archived album or unknown slug returns `null`
   *  so the caller 404s, mirroring `PagesService.findPublishedBySlug()`
   *  (2026-09-04 follow-on to ADR-0054). */
  async findPublishedBySlug(slug: string): Promise<AlbumDocument | null> {
    return this.findOne({ slug, publicationState: 'Published' });
  }

  /**
   * One page of the public gallery, each album carrying its first three
   * photos.
   *
   * The previews come from a `$lookup` whose sub-pipeline is capped at three,
   * so the database returns twelve albums and thirty-six photos rather than
   * every photo of every album for the page to throw away — and one round
   * trip rather than one per album.
   *
   * The cover sorts first by construction: `isCover` is computed inside the
   * sub-pipeline and sorted on before `displayOrder`, so an album whose cover
   * sits tenth in the grid still leads with it.
   */
  async findPublicPage(
    filter: QueryFilter<AlbumDocument>,
    skip: number,
    limit: number,
    previewPhotos: number = ALBUM_PREVIEW_PHOTOS,
  ): Promise<{ items: AlbumListRow[]; total: number }> {
    const [items, total] = await Promise.all([
      this.model
        .aggregate<AlbumListRow>([
          { $match: filter },
          // `eventDate` first because it is what the card shows and what the
          // period filter ranges over; `publishedAt` breaks ties for albums
          // whose occasion date nobody recorded.
          { $sort: { eventDate: -1, publishedAt: -1, _id: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'mediaAssets',
              let: { albumId: '$_id', coverId: '$coverImageId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$albumId', '$$albumId'] },
                    isVisible: true,
                    archivedAt: null,
                  },
                },
                { $addFields: { isCover: { $eq: ['$_id', '$$coverId'] } } },
                { $sort: { isCover: -1, displayOrder: 1, _id: 1 } },
                { $limit: previewPhotos },
                { $unset: 'isCover' },
              ],
              as: 'previewPhotos',
            },
          },
        ])
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * Which filter options exist, and how many published albums each holds.
   *
   * The gallery hides a filter whose list comes back empty, so this is what
   * decides the shape of the filter bar: today the four occasion facets are
   * empty because their modules are not built, and the bar shows period and
   * search alone. It grows by itself as content arrives, with no code change.
   *
   * Names are deliberately absent. Four of the six collections do not exist,
   * so there is nothing to resolve a name from; the caller pairs these ids
   * with names it fetches from the collections that do.
   */
  async facets(): Promise<AlbumFacets> {
    const [seasons, championships, competitions, publicEvents, athletes, clubs] = await Promise.all([
      this.countSeasons(),
      this.countBy('championshipId'),
      this.countBy('competitionId'),
      this.countBy('publicEventId'),
      this.countBy('athleteIds'),
      this.countBy('clubIds'),
    ]);

    return { seasons, championships, competitions, publicEvents, athletes, clubs };
  }

  /** Clears the featured flag from whoever holds it, except the album about
   *  to take it. One statement rather than read-then-write, so two editors
   *  pressing the star at once cannot leave two albums featured. */
  async clearFeatured(exceptId: string): Promise<void> {
    await this.model
      .updateMany({ _id: { $ne: new Types.ObjectId(exceptId) }, isFeatured: true }, { $set: { isFeatured: false } })
      .exec();
  }

  /** The album the gallery leads with: the one marked featured, or the most
   *  recently published when none is marked. */
  async findFeatured(): Promise<AlbumDocument | null> {
    const marked = await this.findOne({ ...PUBLISHED, isFeatured: true });
    if (marked) {
      return marked;
    }
    return this.model.findOne(PUBLISHED).sort({ publishedAt: -1, _id: -1 }).exec();
  }

  /** The hero's three figures, counted rather than estimated. `occasions`
   *  counts distinct championships and public events together, because that
   *  is what the label says — "championships and events" — and counting them
   *  separately would make the number disagree with its own caption. */
  async stats(): Promise<{ albums: number; photos: number; occasions: number }> {
    // One pass, not three. The previous shape ran a count and two aggregations
    // over the same documents, and shipped every distinct occasion id to Node
    // only to read its length.
    const [row] = await this.model
      .aggregate<{ albums: number; photos: number; occasions: number }>([
        { $match: PUBLISHED },
        {
          $group: {
            _id: null,
            albums: { $sum: 1 },
            photos: { $sum: '$assetCount' },
            // Championships and public events counted together, because the
            // label says "championships and events" — counting them apart
            // would make the number disagree with its own caption.
            championships: { $addToSet: '$championshipId' },
            publicEvents: { $addToSet: '$publicEventId' },
          },
        },
        {
          $project: {
            albums: 1,
            photos: 1,
            occasions: {
              $size: { $setDifference: [{ $setUnion: ['$championships', '$publicEvents'] }, [null]] },
            },
          },
        },
      ])
      .exec();

    return { albums: row?.albums ?? 0, photos: row?.photos ?? 0, occasions: row?.occasions ?? 0 };
  }

  /**
   * Counts published albums per season, derived from `eventDate`.
   *
   * There is no season collection and none is being added (`videos/season.ts`),
   * so this groups by the season each album's date falls in rather than by a
   * stored id. The boundary month comes from that same helper — one definition
   * of where a season starts, not two.
   *
   * Newest first, because a visitor looking for a season is far likelier to
   * want the current one than the oldest.
   */
  private async countSeasons(): Promise<AlbumFacetEntry[]> {
    const rows = await this.model
      .aggregate<{ _id: number; count: number }>([
        { $match: { ...PUBLISHED, eventDate: { $type: 'date' } } },
        {
          // The season's starting year: a date before the boundary month
          // belongs to the season that opened the previous calendar year.
          $group: {
            _id: {
              $subtract: [
                { $year: '$eventDate' },
                { $cond: [{ $lt: [{ $month: '$eventDate' }, SEASON_START_MONTH] }, 1, 0] },
              ],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ])
      .exec();

    return rows.map((row) => ({ id: seasonLabel(new Date(Date.UTC(row._id, SEASON_START_MONTH - 1, 1))), count: row.count }));
  }

  /** Counts published albums per distinct value of one field. `$unwind` makes
   *  the array fields behave like the scalar ones — an album naming three
   *  athletes counts once for each, which is what the option's number means. */
  private async countBy(field: string): Promise<AlbumFacetEntry[]> {
    const rows = await this.model
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        // `$type` rather than `$nin: [null, []]`: it means the same thing —
        // the field carries at least one value — but it gives tight index
        // bounds on both the scalar fields and the multikey arrays, where a
        // `$nin` is unindexable and forces a full pass. The four facets that
        // are empty today then read nothing at all.
        { $match: { ...PUBLISHED, [field]: { $type: 'objectId' } } },
        { $unwind: `$${field}` },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ])
      .exec();

    return rows.map((row) => ({ id: row._id.toString(), count: row.count }));
  }

  /**
   * Other published albums related to this one, closest relationship first.
   *
   * Four tiers, in the order the Product Owner set (2026-09-25): the same
   * competition, then the same championship or public event, then a shared
   * athlete, then the same season. A flat "shares anything" match would put an
   * album from the same season — which can be hundreds — beside one from the
   * very same final, and the reader cannot tell which is which.
   *
   * The tier is computed in the query rather than by sorting in memory,
   * because the limit has to be applied to the ranked list: fetching every
   * album in a season to keep four of them is the shape this avoids.
   *
   * An album with no affiliation returns an empty array without querying —
   * there is nothing it could be related by, and an `$or` of zero conditions
   * matches everything.
   */
  async findRelated(album: AlbumDocument, limit: number): Promise<AlbumDocument[]> {
    const { competitionId, championshipId, publicEventId, eventDate, athleteIds } = album;

    // Each tier's condition, paired with its rank. Only the ones this album
    // can actually be related by are built.
    const tiers: { rank: number; match: Record<string, unknown> }[] = [];
    if (competitionId) tiers.push({ rank: 1, match: { competitionId } });
    if (championshipId) tiers.push({ rank: 2, match: { championshipId } });
    if (publicEventId) tiers.push({ rank: 2, match: { publicEventId } });
    if (athleteIds.length > 0) tiers.push({ rank: 3, match: { athleteIds: { $in: athleteIds } } });
    // The fourth tier is the same season, derived from the date rather than
    // stored: an album has no `seasonId`, so "same season" is "a date inside
    // the same half-open range". `seasonRange` owns where that range starts.
    const season = eventDate ? seasonRange(seasonLabel(eventDate)) : null;
    if (season) {
      tiers.push({ rank: 4, match: { eventDate: { $gte: season.from, $lt: season.to } } });
    }

    if (tiers.length === 0) {
      return [];
    }

    const documents = await this.model
      .aggregate<AlbumDocument>([
        {
          $match: {
            ...PUBLISHED,
            _id: { $ne: album._id },
            $or: tiers.map((tier) => tier.match),
          },
        },
        {
          // First branch that matches wins, so the branches are listed
          // closest-first and a competition sibling never reads as a mere
          // season sibling.
          $addFields: {
            relatedRank: {
              $switch: {
                branches: tiers.map((tier) => ({
                  case: { $and: Object.entries(tier.match).map(([field, value]) => matchExpression(field, value)) },
                  then: tier.rank,
                })),
                default: 99,
              },
            },
          },
        },
        { $sort: { relatedRank: 1, publishedAt: -1, _id: 1 } },
        { $limit: limit },
        { $unset: 'relatedRank' },
      ])
      .exec();

    return documents;
  }
}
