import type { Model, QueryFilter } from 'mongoose';
import { Article } from '../../public-communication/articles/schemas/article.schema.js';
import type { ArticleDocument } from '../../public-communication/articles/schemas/article.schema.js';
import { Album } from '../../media-center/albums/schemas/album.schema.js';
import type { AlbumDocument } from '../../media-center/albums/schemas/album.schema.js';
import { Video } from '../../media-center/videos/schemas/video.schema.js';
import type { VideoDocument } from '../../media-center/videos/schemas/video.schema.js';
import { buildPublicVideoFilter } from '../../media-center/videos/videos.public-filter.js';
import { Club } from '../../people-organizations/clubs/schemas/club.schema.js';
import type { ClubDocument } from '../../people-organizations/clubs/schemas/club.schema.js';
import { Athlete } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import type { AthleteDocument } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import { AthleteProfile } from '../../people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';
import type { AthleteProfileDocument } from '../../people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';
import { Coach } from '../../people-organizations/coaches/schemas/coach.schema.js';
import type { CoachDocument } from '../../people-organizations/coaches/schemas/coach.schema.js';

/** Every source key the endpoint accepts through `types=`. An unlisted value
 *  in a request matches nothing and is dropped silently — see
 *  `SearchService.search`. */
export const SEARCH_SOURCE_KEYS = ['articles', 'albums', 'videos', 'clubs', 'athletes', 'coaches'] as const;
export type SearchSourceKey = (typeof SEARCH_SOURCE_KEYS)[number];

/**
 * One registered source of site-wide search results.
 *
 * `model` is the collection the `$text` query actually runs against — the
 * one carrying the text index — which is not always the collection the
 * public URL is built from (see `resolvePublicRows`).
 */
export interface SearchSource {
  key: SearchSourceKey;
  model: Model<Record<string, unknown>>;
  /** Localized field on a row returned from `model`, e.g. `'title'`. */
  titlePath: string;
  subtitlePath: string | null;
  /** Field on the row holding a `MediaAsset` id, or null if the source has
   *  no image. Not part of the text search — purely for `thumbnailId`. */
  thumbnailPath: string | null;
  /** Applied together with `$text.$search`; the rows a visitor may see. */
  publicFilter: QueryFilter<Record<string, unknown>>;
  /** The public route a hit lands on, built from the row, never from the id. */
  hrefOf: (row: Record<string, unknown>) => string | null;
  /**
   * Cross-collection resolution for a source whose text index and public
   * identity live in different collections.
   *
   * Only `athletes` needs this: `athleteProfiles` carries no bilingual name
   * of its own (confirmed against `athlete-profile.schema.ts` — there is no
   * `displayName`), so the text index lives on `athletes.name` instead, and
   * a match there is not yet a public result — a Guest athlete has no
   * profile and therefore no public page. This turns matched `athletes` rows
   * into the `athleteProfiles` rows `hrefOf`/`titlePath` actually read,
   * dropping any athlete with no live profile rather than showing one with
   * nowhere to go. Absent for every source whose `model` already IS the
   * public row.
   */
  resolvePublicRows?: (
    matches: ReadonlyArray<Record<string, unknown>>,
  ) => Promise<Array<Record<string, unknown>>>;
}

export interface SearchSourceModels {
  articleModel: Model<ArticleDocument>;
  albumModel: Model<AlbumDocument>;
  videoModel: Model<VideoDocument>;
  clubModel: Model<ClubDocument>;
  athleteModel: Model<AthleteDocument>;
  athleteProfileModel: Model<AthleteProfileDocument>;
  coachModel: Model<CoachDocument>;
}

/** Athlete ids matched by the text index, resolved through their profile —
 *  the only place a slug, a photo and public visibility exist together. */
const resolveAthleteProfiles =
  (athleteProfileModel: Model<AthleteProfileDocument>) =>
  async (matches: ReadonlyArray<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> => {
    if (matches.length === 0) return [];

    const namesByAthleteId = new Map(matches.map((athlete) => [String(athlete._id), athlete.name]));
    const profiles = await athleteProfileModel
      .find({ athleteId: { $in: [...namesByAthleteId.keys()] }, archivedAt: null })
      .lean()
      .exec();

    return profiles.map((profile) => ({
      _id: profile._id,
      slug: profile.slug,
      photoId: profile.photoId,
      name: namesByAthleteId.get(String(profile.athleteId)) ?? null,
    }));
  };

/**
 * The registered sources, in one place so a new one (seasons, public events)
 * is an entry here plus a text index on its collection — `SearchService`
 * and `SearchController` read this list generically and never name a source.
 *
 * A plain exported constant cannot hold live `Model` instances in this
 * codebase's DI style (every other module reaches its model through
 * `@InjectModel`, never a module-scope singleton), so this is a factory
 * `SearchService` calls once, in its constructor, with the models Nest
 * already injected for it.
 */
export const buildSearchSources = (models: SearchSourceModels): readonly SearchSource[] => [
  {
    key: 'articles',
    model: models.articleModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'title',
    subtitlePath: null,
    thumbnailPath: 'coverMediaId',
    // The live, unhidden, non-deleted feed — `ArticlesService.publicFilter` /
    // `findLiveForSitemap` (articles.service.ts), reused rather than
    // re-derived: `ARTICLE_PUBLICATION_STATES` is `['Draft', 'Live']`, so the
    // brief's literal `'Published'` never matches any row.
    publicFilter: { publicationState: 'Live', archived: false, archivedAt: null },
    hrefOf: (row) => (typeof row.slug === 'string' ? `/news/${row.slug}` : null),
  },
  {
    key: 'albums',
    model: models.albumModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'title',
    subtitlePath: null,
    thumbnailPath: 'coverImageId',
    publicFilter: { publicationState: 'Published', archivedAt: null },
    hrefOf: (row) => (typeof row.slug === 'string' ? `/media/albums/${row.slug}` : null),
  },
  {
    key: 'videos',
    model: models.videoModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'title',
    subtitlePath: null,
    thumbnailPath: 'thumbnailId',
    // `buildPublicVideoFilter` is the video library's own public filter
    // (videos.public-filter.ts); called with no query narrowing so it
    // contributes only its non-negotiable base: published, not archived.
    publicFilter: buildPublicVideoFilter({}),
    hrefOf: (row) => (row._id ? `/media/videos?video=${String(row._id)}` : null),
  },
  {
    key: 'clubs',
    model: models.clubModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'name',
    subtitlePath: null,
    thumbnailPath: 'logoId',
    // `ClubsService.findAllPublic` gates its public listing on `status:
    // 'Active'` in addition to the soft-delete scope every `BaseRepository`
    // read already applies — the brief's `archivedAt: null` alone would
    // surface an `Inactive` club in search.
    publicFilter: { status: 'Active', archivedAt: null },
    hrefOf: (row) => (typeof row.slug === 'string' ? `/clubs#${row.slug}` : null),
  },
  {
    key: 'athletes',
    // The text index lives on `athletes.name` — see `resolvePublicRows`.
    model: models.athleteModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'name',
    subtitlePath: null,
    thumbnailPath: 'photoId',
    publicFilter: { archivedAt: null },
    // `/athletes#slug`, not `/athletes/:slug`: `apps/web/src/app/[locale]/athletes/`
    // has only `page.tsx` — a directory page with same-page anchors, the exact
    // shape `clubs`/`coaches` already use, not a detail route. Revisit this the
    // day an athlete detail page ships.
    hrefOf: (row) => (typeof row.slug === 'string' ? `/athletes#${row.slug}` : null),
    resolvePublicRows: resolveAthleteProfiles(models.athleteProfileModel),
  },
  {
    key: 'coaches',
    model: models.coachModel as unknown as Model<Record<string, unknown>>,
    titlePath: 'fullName',
    subtitlePath: null,
    thumbnailPath: 'photoId',
    // No public route exists for `coaches` yet, so there is no precedent
    // filter to reuse. `status: 'Active'` is applied by direct analogy to
    // `ClubsService.findAllPublic` (the identical field, same domain) rather
    // than the brief's `archivedAt: null` alone, so an `Inactive` coach
    // cannot surface here either — flagged in the report for owner
    // confirmation since it goes beyond the brief's literal filter.
    publicFilter: { status: 'Active', archivedAt: null },
    hrefOf: (row) => (typeof row.slug === 'string' ? `/coaches#${row.slug}` : null),
  },
];

export { Article, Album, Video, Club, Athlete, AthleteProfile, Coach };
