import { fetchPublic } from "@/lib/api/public-client";
import { fetchPublicMedia } from "@/lib/api/media";
import { albumApiParams } from "@/lib/albums/album-query";
import type { AlbumQuery } from "@/lib/albums/album-query";
import { EMPTY_ALBUM_FACETS } from "@/lib/albums/facet-options";
import type {
  AlbumFacetNames,
  AlbumFacets,
  AlbumListItem,
  AlbumListResponse,
  AlbumStats,
  NamedEntity,
} from "@/lib/albums/album-types";
import type { DeckCover } from "@/components/shared/albums/types";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import type { MediaAssetPublic, Paginated } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The album pages' reads from the public API, in one place.
 *
 * A private folder of the route rather than `lib/albums`, because these are
 * the two album pages' own questions — which page of the archive, which album
 * is featured, which albums sit beside this one — and `lib/albums` holds the
 * contracts the shared components are built on, which these pages consume
 * but do not own.
 *
 * Every read goes through `fetchPublic`, so every failure is `null` and every
 * page decides what `null` means for it: the archive renders without the part
 * it could not fetch, and an album that does not resolve is a 404.
 */

/** Two rows of four under the featured album. The API's own default is the
 *  same number; it is sent anyway, so a change of default upstream cannot
 *  silently re-shape the grid. */
export const ALBUMS_PAGE_SIZE = 8;

/**
 * How many pages "show more" may stack under the current one.
 *
 * Each extra page is one more read in the same render, so the address cannot
 * be allowed to ask for an unbounded number of them. Five extra pages is 48
 * albums on a phone, well past where a reader turns to the filters instead.
 */
export const MAX_MORE = 5;

/** A related album on the album page, as the API summarises it. */
export interface RelatedAlbumSummary {
  id: string;
  title: AlbumListItem["title"];
  slug: string;
  coverImageId: string | null;
  publishedAt: string | null;
}

/** One album without the list's preview photos (`AlbumPublicResponseDto`). */
export type AlbumPublic = Omit<AlbumListItem, "previewPhotos">;

/** `GET /albums/public/:slug?skip=<n>`. */
export interface AlbumDetail {
  album: AlbumPublic;
  /** One page of visible photos — at most `PHOTO_PAGE_SIZE` — in display
   *  order, starting at `photoSkip`. */
  mediaAssets: MediaAssetPublic[];
  /** Visible photos across every page, counted in the same round trip as the
   *  page, so the two always describe the same moment. */
  photoTotal: number;
  /** The offset that produced `mediaAssets`. */
  photoSkip: number;
  relatedAlbums: RelatedAlbumSummary[];
}

/** Photos per page of `GET /albums/public/:slug`; the API's own page size. */
export const PHOTO_PAGE_SIZE = 40;

/** `?more=` as a count of extra pages, clamped; anything unreadable is none. */
export const readMoreParam = (
  params: Record<string, string | string[] | undefined>,
): number => {
  const raw = params.more;
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) && value > 0 ? Math.min(value, MAX_MORE) : 0;
};

/**
 * The albums on screen: the requested page, plus `more` pages after it.
 *
 * One read per page at the fixed page size rather than one larger read,
 * because the API pages by `(page - 1) * limit`: a single read of 24 starting
 * at page 2 would begin at row 24, not row 8. Reads run in parallel, and a
 * failure after the first page ends the list there — an incomplete run with
 * "show more" under it would offer rows that are already missing above.
 */
export const loadAlbumList = async (
  query: AlbumQuery,
  more: number,
  now: Date = new Date(),
): Promise<{ items: AlbumListItem[]; total: number } | null> => {
  const pages = await Promise.all(
    Array.from({ length: more + 1 }, (_, offset) =>
      fetchPublic<AlbumListResponse>(
        `/albums/public?${albumApiParams({ ...query, page: query.page + offset }, ALBUMS_PAGE_SIZE, now)}`,
        ["albums"],
      ),
    ),
  );

  const first = pages[0];
  if (!first) return null;

  const items: AlbumListItem[] = [];
  for (const page of pages) {
    if (!page) break;
    items.push(...page.items);
  }
  return { items, total: first.total };
};

export const loadAlbumStats = (): Promise<AlbumStats | null> =>
  fetchPublic<AlbumStats>("/albums/public/stats", ["albums"]);

/** An unreachable facets read offers no entity filter, which is also what an
 *  archive with no linked entities looks like — never an error. */
export const loadAlbumFacets = async (): Promise<AlbumFacets> =>
  (await fetchPublic<AlbumFacets>("/albums/public/facets", ["albums"])) ??
  EMPTY_ALBUM_FACETS;

/** The public lists' own ceiling (`PaginationQueryDto`, `@Max(200)`). */
const NAMES_LIMIT = 200;

const loadNames = async (path: string): Promise<NamedEntity[]> =>
  (await fetchPublic<Paginated<NamedEntity>>(`${path}?limit=${NAMES_LIMIT}`))
    ?.items ?? [];

/**
 * Names for the facet ids, read only for a facet that has ids to name.
 *
 * Seasons need none: a season facet's id is its label, and the filter shows
 * it as it is. Championships, competitions and public events have no entity
 * to read a name from yet; `albumFilterOptions` leaves an unnamed id out
 * rather than showing it raw, so those filters stay hidden until their modules
 * ship. With no athlete or club facets this makes no request at all.
 */
export const loadFacetNames = async (
  facets: AlbumFacets,
): Promise<AlbumFacetNames> => {
  const [athletes, clubs] = await Promise.all([
    facets.athletes.length > 0
      ? loadNames("/athletes/public")
      : Promise.resolve([]),
    facets.clubs.length > 0 ? loadNames("/clubs/public") : Promise.resolve([]),
  ]);
  return { athletes, clubs };
};

/**
 * One album with one page of its photos, or `null`.
 *
 * The endpoint answers HTTP 200 with a `null` body for a slug that names no
 * published album, which `fetchPublic` already returns as `null` — the same
 * value it returns for an unreachable API. The page maps both to 404, the
 * news article's convention: neither leaves anything to show.
 *
 * `skip` is always sent, `0` included, so the first page and every later one
 * are the same request shape and share one cache key per offset.
 */
export const loadAlbumDetail = (
  slug: string,
  skip = 0,
): Promise<AlbumDetail | null> =>
  fetchPublic<AlbumDetail>(
    `/albums/public/${encodeURIComponent(slug)}?skip=${skip}`,
    ["albums"],
  );

/**
 * The album's first page of photos, extended until it holds `photoId`.
 *
 * `?photo=<id>` may name a photo past the first page, and the server must
 * render that photo first. Its position is unknown until a page carries it,
 * so pages are read in order until one does or the album ends — bounded by
 * `photoTotal`, so a stale id costs at most one read per page and then opens
 * the album on its first photo, the viewer's own rule. Without an id this is
 * exactly one read.
 */
export const loadAlbumThrough = async (
  slug: string,
  photoId: string | null,
): Promise<AlbumDetail | null> => {
  const first = await loadAlbumDetail(slug, 0);
  if (!first || !photoId) return first;

  const photos = [...first.mediaAssets];
  while (
    !photos.some((asset) => asset.id === photoId) &&
    photos.length < first.photoTotal
  ) {
    const next = await loadAlbumDetail(slug, photos.length);
    if (!next || next.mediaAssets.length === 0) break;
    photos.push(...next.mediaAssets);
  }
  return { ...first, mediaAssets: photos };
};

/** The album's cover among the photos read so far, falling back to the first
 *  one. Synchronous, for places that already hold the page; `loadCover` also
 *  finds a cover that sits past it. */
export const coverOf = (detail: AlbumDetail): MediaAssetPublic | undefined =>
  detail.mediaAssets.find((asset) => asset.id === detail.album.coverImageId) ??
  detail.mediaAssets[0];

/**
 * The album's cover, wherever it sits in the album.
 *
 * Photos arrive a page at a time, and the editor may have chosen photo 57 as
 * the cover. It is then resolved by id through the media read rather than
 * silently replaced by the first photo of the page.
 */
export const loadCover = async (
  detail: AlbumDetail,
): Promise<MediaAssetPublic | undefined> => {
  const onPage = detail.mediaAssets.find(
    (asset) => asset.id === detail.album.coverImageId,
  );
  if (onPage || !detail.album.coverImageId)
    return onPage ?? detail.mediaAssets[0];
  const media = await fetchPublicMedia([detail.album.coverImageId]);
  return media.get(detail.album.coverImageId) ?? detail.mediaAssets[0];
};

/** The cover first, then the rest of the page in order. */
const coverFirst = (
  detail: AlbumDetail,
  cover: MediaAssetPublic | undefined,
): MediaAssetPublic[] =>
  cover
    ? [cover, ...detail.mediaAssets.filter((asset) => asset.id !== cover.id)]
    : detail.mediaAssets;

/** An album read on its own, in the shape `AlbumCard` draws: up to three
 *  photos, the cover first — the list's own `previewPhotos` rule. */
export const asListItem = (
  detail: AlbumDetail,
  cover: MediaAssetPublic | undefined = coverOf(detail),
): AlbumListItem => ({
  ...detail.album,
  previewPhotos: coverFirst(detail, cover).slice(0, 3),
});

/** The deck's five slots. */
const DECK_COVERS = 5;

export interface FeaturedAlbum {
  album: AlbumListItem;
  covers: DeckCover[];
}

/**
 * The featured album and the covers its deck turns through.
 *
 * `/featured` answers the album without photos, so its photos come from the
 * album's own read: the deck needs five of them and the list shape carries
 * three. `null` when nothing is featured, which is an ordinary state.
 */
export const loadFeaturedAlbum = async (): Promise<FeaturedAlbum | null> => {
  const featured = await fetchPublic<AlbumPublic>("/albums/public/featured", [
    "albums",
  ]);
  if (!featured) return null;

  const detail = await loadAlbumDetail(featured.slug);
  if (!detail) return null;

  const cover = await loadCover(detail);

  return {
    album: asListItem(detail, cover),
    covers: coverFirst(detail, cover)
      .slice(0, DECK_COVERS)
      .map((photo) => ({ id: photo.id, photo })),
  };
};

/** The related strip's width on desktop; the phone shows the first two. */
export const RELATED_COUNT = 4;

/**
 * The related albums, in the shape `AlbumCard` draws.
 *
 * The detail read summarises them without photos, a count, a date or a place
 * — everything the card shows — so each is read in full. Four reads in
 * parallel, each cached for the same window as every other public read. One
 * that no longer resolves (unpublished since) is dropped rather than drawn
 * half-empty.
 */
export const loadRelatedAlbums = async (
  detail: AlbumDetail,
): Promise<AlbumListItem[]> => {
  const reads = await Promise.all(
    detail.relatedAlbums
      .slice(0, RELATED_COUNT)
      .map((related) => loadAlbumDetail(related.slug)),
  );
  const found = reads.filter((read): read is AlbumDetail => read !== null);
  const covers = await Promise.all(found.map(loadCover));
  return found.map((read, index) => asListItem(read, covers[index]));
};

/**
 * One photo as the viewer takes it, already in the reader's language.
 *
 * `credit` is the photographer and nothing else: the public DTO carries no
 * issuing body, so `source` stays undefined, and a photo with no photographer
 * has no credit line at all rather than a placeholder (owner decision).
 */
export const toViewerPhoto = (
  asset: MediaAssetPublic,
  locale: AppLocale,
): ViewerPhoto => ({
  id: asset.id,
  src: asset.file.url,
  width: asset.file.width,
  height: asset.file.height,
  alt: asset.altText[locale] ?? "",
  caption: asset.caption[locale]?.trim() || null,
  credit: asset.file.photographer?.trim() || null,
});
