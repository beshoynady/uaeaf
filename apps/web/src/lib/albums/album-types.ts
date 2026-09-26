import type { LocalizedText, MediaAssetPublic } from "@/lib/api/types";

/**
 * The public album API as this application reads it (`api/openapi.json`,
 * `AlbumListItemDto`, `AlbumFacetsDto`, `AlbumStatsDto`).
 *
 * Written out here rather than generated because the page, the shared
 * components and their tests all need the same shape, and a component that
 * declared its own copy would keep compiling after the API changed underneath
 * the other two.
 */

/**
 * One album in `GET /albums/public`. Dates are ISO strings on the wire.
 *
 * There is no season field: an album's season is the one its `eventDate`
 * falls in, derived by the API wherever it is needed, and a `seasonId` here
 * would promise the page a value the API no longer sends.
 */
export interface AlbumListItem {
  id: string;
  title: LocalizedText;
  slug: string;
  description: LocalizedText | null;
  championshipId: string | null;
  competitionId: string | null;
  publicEventId: string | null;
  athleteIds: string[];
  clubIds: string[];
  eventDate: string | null;
  location: LocalizedText | null;
  isFeatured: boolean;
  /** Captured on the album because no championship entity exists yet. */
  championshipName: LocalizedText | null;
  coverImageId: string | null;
  publishedAt: string | null;
  tags: string[];
  assetCount: number;
  /** The first photos in display order, already resolved. */
  previewPhotos: MediaAssetPublic[];
}

export interface AlbumListResponse {
  items: AlbumListItem[];
  total: number;
  page: number;
  limit: number;
}

/** How many published albums carry one value of a filter. */
export interface AlbumFacetEntry {
  /** An entity's ObjectId — or, in `seasons`, the season's label. */
  id: string;
  count: number;
}

export interface AlbumFacets {
  /** Grouped from published albums' dates, newest first. Each `id` is a
   *  label such as `2025–2026`, and it is also what the reader sees. */
  seasons: AlbumFacetEntry[];
  championships: AlbumFacetEntry[];
  competitions: AlbumFacetEntry[];
  publicEvents: AlbumFacetEntry[];
  athletes: AlbumFacetEntry[];
  clubs: AlbumFacetEntry[];
}

export type AlbumFacetKey = keyof AlbumFacets;

export interface AlbumStats {
  albums: number;
  photos: number;
  occasions: number;
}

/**
 * Anything a facet id can be named from: `GET /athletes/public` and
 * `GET /clubs/public` items already have this shape, and so will the
 * championship, competition and event entities when they exist. A season never
 * will: it has no entity, and its label is its name.
 */
export interface NamedEntity {
  id: string;
  name: LocalizedText;
}

/** The facets whose ids need a name before they can be offered. */
export type NamedAlbumFacetKey = Exclude<AlbumFacetKey, "seasons">;

/** The names the filter bar may show, per facet. A facet id with no name here
 *  is not offered: an option reading as a raw id is not a choice a reader can
 *  make. Seasons are not in it, because a season label reads as itself. */
export type AlbumFacetNames = Partial<Record<NamedAlbumFacetKey, readonly NamedEntity[]>>;
