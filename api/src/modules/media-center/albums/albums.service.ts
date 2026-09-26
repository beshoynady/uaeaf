import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlbumsRepository } from './albums.repository.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { UpdateAlbumDto } from './dto/update-album.dto.js';
import { assertAffiliationShape } from './album-affiliation.js';
import { buildAlbumFilter } from './albums.public-filter.js';
import type { AlbumFilterQuery } from './albums.public-filter.js';
import type { AlbumFacets } from './albums.repository.js';
import {
  AlbumListItemDto,
  AlbumListResponseDto,
  AlbumStatsDto,
} from './dto/album-list-response.dto.js';

/** Albums per page in the public gallery.
 *
 *  Eight, because the approved canvas lays the grid out as two rows of four
 *  beneath the featured album, which stands alone above them. The mobile
 *  "show more" button adds another eight for the same reason — it is the same
 *  page, asked for one screen at a time. */
export const ALBUM_PAGE_SIZE = 8;

/** Photos per request on the album page. The viewer asks for the next page as
 *  the reader reaches the end; sending an album of several hundred whole would
 *  be megabytes of JSON before the first photograph is drawn. */
export const ALBUM_PHOTO_PAGE_SIZE = 40;
import { AlbumPublicResponseDto, RelatedAlbumSummaryDto } from './dto/album-public-response.dto.js';
import { AlbumDetailPageResponseDto } from './dto/album-detail-page-response.dto.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../../common/utils/mongo-errors.util.js';

/** `tags[]` cleanup bounds. Confirmed final (2026-09-03) — not a
 *  placeholder. */
export const ALBUM_MAX_TAGS = 20;
export const ALBUM_MAX_TAG_LENGTH = 40;

/** Related-albums strip cap. The strip is ranked, not flat: see
 *  `AlbumsRepository.findRelated` for the four tiers and why the rank is
 *  computed in the query rather than by sorting in memory. */
export const ALBUM_RELATED_LIMIT = 8;

/** Implements: albums collection, Domain 5 — Media Center (FigJam node
 *  `92:7224`). `publicationState` is self-published by Media Center staff,
 *  with no Domain 7 Workflow gate (see the schema's doc comment). */
@Injectable()
export class AlbumsService {
  constructor(
    private readonly repository: AlbumsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** `null` for an absent id, an `ObjectId` for a present one. Written once
   *  because six fields need it and six inline ternaries is six chances to
   *  write `undefined` into a field Mongo then treats as "missing" rather
   *  than "none". */
  private static objectIdOrNull(id: string | null | undefined): Types.ObjectId | null {
    return id ? new Types.ObjectId(id) : null;
  }

  /** @throws NotFoundException when `dto.coverImageId` doesn't reference an
   *  existing, non-archived `MediaAsset`, via `MediaAssetsService`.
   *  @throws ConflictException when that asset isn't an image type, or
   *  `dto.slug` is already taken. */
  async create(dto: CreateAlbumDto): Promise<AlbumDocument> {
    // Before the cover is fetched and before anything is written: an
    // incoherent affiliation makes the whole request wrong, and acting on
    // half of it would leave the editor guessing which half took effect.
    assertAffiliationShape(dto);

    if (dto.coverImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.coverImageId);
    }

    try {
      return await this.repository.create({
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        championshipId: AlbumsService.objectIdOrNull(dto.championshipId),
        competitionId: AlbumsService.objectIdOrNull(dto.competitionId),
        publicEventId: AlbumsService.objectIdOrNull(dto.publicEventId),
        athleteIds: (dto.athleteIds ?? []).map((id) => new Types.ObjectId(id)),
        clubIds: (dto.clubIds ?? []).map((id) => new Types.ObjectId(id)),
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        location: dto.location ?? null,
        isFeatured: false,
        championshipName: dto.championshipName ?? null,
        coverImageId: AlbumsService.objectIdOrNull(dto.coverImageId),
        displayOrder: dto.displayOrder,
        publicationState: dto.publicationState,
        publishedAt: null,
        publishedBy: null,
        tags: this.cleanTags(dto.tags),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'slug'}.`);
      }
      throw error;
    }
  }

  /**
   * One page of the public gallery.
   *
   * The card's photos are resolved here rather than by the caller, because a
   * card that cannot draw an image is not a card — and asking the browser for
   * them separately would be one request per album on a page of twelve.
   */
  async listPublic(
    query: AlbumFilterQuery,
    page = 1,
    limit = ALBUM_PAGE_SIZE,
    previewPhotos?: number,
  ): Promise<AlbumListResponseDto> {
    const filter = buildAlbumFilter(query);
    const { items, total } = await this.repository.findPublicPage(
      filter,
      (page - 1) * limit,
      limit,
      previewPhotos,
    );

    return {
      items: items.map((row) => ({
        ...this.toPublicResponse(row as unknown as AlbumDocument),
        previewPhotos: row.previewPhotos.map((photo) => this.mediaAssetsService.toPublicResponse(photo)),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Published albums by id, in no particular order.
   *
   * For a caller that already knows which albums it wants — the homepage's
   * manual selection. It asks by id rather than searching a page of recent
   * albums, so an older choice cannot silently fall out of range; ordering the
   * result is the caller's job, because only the caller knows the order the
   * editor arranged.
   */
  async listPublicByIds(ids: readonly string[], previewPhotos?: number): Promise<AlbumListItemDto[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (valid.length === 0) {
      return [];
    }

    const { items } = await this.repository.findPublicPage(
      { publicationState: 'Published', archivedAt: null, _id: { $in: valid } },
      0,
      valid.length,
      previewPhotos,
    );

    return items.map((row) => ({
      ...this.toPublicResponse(row as unknown as AlbumDocument),
      previewPhotos: row.previewPhotos.map((photo) => this.mediaAssetsService.toPublicResponse(photo)),
    }));
  }

  /** Which filter options exist and how many albums each holds — what decides
   *  whether a filter is drawn at all. See `AlbumsRepository.facets()`. */
  async facets(): Promise<AlbumFacets> {
    return this.repository.facets();
  }

  /** The album the gallery leads with: the one marked featured, or the most
   *  recently published when nobody has marked one. A gallery whose lead slot
   *  is empty because an editor forgot is worse than one that chooses. */
  async featured(): Promise<AlbumPublicResponseDto | null> {
    const album = await this.repository.findFeatured();
    return album ? this.toPublicResponse(album) : null;
  }

  /** The three figures in the hero. Counted, never estimated: a federation
   *  publishing a number about itself has to be able to stand behind it. */
  async stats(): Promise<AlbumStatsDto> {
    return this.repository.stats();
  }

  /**
   * Edits an album.
   *
   * The coherence rules run against the album as it will be, not against the
   * patch: clearing a championship while saying nothing about its competition
   * leaves a competition with nothing above it, and a check that saw only the
   * patch would let that through. `undefined` means "leave it alone" and
   * `null` means "clear it", which is why the merge distinguishes them.
   *
   * `slug` and `publicationState` are not on `UpdateAlbumDto` at all, so no
   * filtering is needed here to keep them out — see that DTO for why.
   *
   * @throws NotFoundException when `id` references no album.
   * @throws UnprocessableEntityException when the merged affiliation is
   * incoherent, via `assertAffiliationShape`.
   */
  async update(id: string, dto: UpdateAlbumDto): Promise<AlbumDocument | null> {
    const current = await this.assertAlbum(id);

    const merged = {
      championshipId: AlbumsService.mergeId(dto.championshipId, current.championshipId),
      competitionId: AlbumsService.mergeId(dto.competitionId, current.competitionId),
      publicEventId: AlbumsService.mergeId(dto.publicEventId, current.publicEventId),
    };
    assertAffiliationShape(merged);

    if (dto.coverImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.coverImageId);
    }

    // Only the keys the caller actually sent: a patch that names three fields
    // must not blank the other twelve.
    const patch: Record<string, unknown> = {};
    const assign = (key: string, value: unknown) => {
      if (value !== undefined) patch[key] = value;
    };

    assign('title', dto.title);
    assign('description', dto.description);
    assign('championshipName', dto.championshipName);
    assign('displayOrder', dto.displayOrder);
    assign('tags', dto.tags ? this.cleanTags(dto.tags) : undefined);
    assign('location', dto.location);
    assign('eventDate', dto.eventDate === null ? null : dto.eventDate ? new Date(dto.eventDate) : undefined);
    assign('coverImageId', dto.coverImageId === null ? null : AlbumsService.objectIdOrNull(dto.coverImageId) ?? undefined);
    assign('athleteIds', dto.athleteIds?.map((value) => new Types.ObjectId(value)));
    assign('clubIds', dto.clubIds?.map((value) => new Types.ObjectId(value)));

    for (const key of ['championshipId', 'competitionId', 'publicEventId'] as const) {
      if (dto[key] !== undefined) patch[key] = AlbumsService.objectIdOrNull(dto[key]);
    }

    return this.repository.updateById(id, patch);
  }

  /** A PATCH has three states per field and a create has two: `undefined`
   *  leaves the stored value, `null` clears it, an id replaces it. */
  private static mergeId(
    patched: string | null | undefined,
    stored: Types.ObjectId | null,
  ): string | null {
    if (patched === undefined) return stored ? stored.toString() : null;
    return patched;
  }

  /**
   * Removes one photo from an album.
   *
   * When the removed photo was the cover, the next one by display order takes
   * its place — and when there is no next one, the cover is cleared. Leaving a
   * published album pointing at an archived photo would break its hero and its
   * card at once, and the editor who deleted the picture has no reason to
   * expect that.
   *
   * `assetCount` is maintained by `MediaAssetsService.remove()`, which owns
   * the `$inc`; doing it here as well would decrement twice.
   *
   * @throws NotFoundException when the photo is not in this album — including
   * when it exists but belongs to another one, which is the same answer as far
   * as this album is concerned.
   */
  async removePhoto(albumId: string, photoId: string, archivedBy: Types.ObjectId): Promise<void> {
    const album = await this.assertAlbum(albumId);
    const photo = await this.mediaAssetsService.findById(photoId);
    if (!photo || photo.albumId?.toString() !== albumId) {
      throw new NotFoundException(`Photo ${photoId} is not in album ${albumId}.`);
    }

    await this.mediaAssetsService.remove(photoId, archivedBy);

    if (album.coverImageId?.toString() === photoId) {
      const next = await this.mediaAssetsService.findFirstInAlbum(album._id);
      await this.repository.updateById(albumId, { coverImageId: next?._id ?? null });
    }
  }

  /** Designates one of the album's own photos as its cover.
   *  @throws NotFoundException when the photo is not in this album. */
  async setCover(albumId: string, photoId: string): Promise<AlbumDocument | null> {
    await this.assertAlbum(albumId);
    const photo = await this.mediaAssetsService.findById(photoId);
    if (!photo || photo.albumId?.toString() !== albumId) {
      throw new NotFoundException(`Photo ${photoId} is not in album ${albumId}.`);
    }
    return this.repository.updateById(albumId, { coverImageId: photo._id });
  }

  /**
   * Writes a new display order for every photo in the album.
   *
   * The request must name every photo, exactly once. A partial order would
   * leave the unnamed ones at positions the editor never chose, and two photos
   * sharing a position is a grid whose order changes between reads.
   *
   * @throws ConflictException when the ids do not match the album's photos.
   */
  async reorderPhotos(albumId: string, photoIds: string[]): Promise<void> {
    await this.assertAlbum(albumId);
    const photos = await this.mediaAssetsService.findAllInAlbum(new Types.ObjectId(albumId));

    const stored = new Set(photos.map((photo) => photo._id.toString()));
    const given = new Set(photoIds);
    const matches = given.size === photoIds.length && given.size === stored.size
      && photoIds.every((id) => stored.has(id));
    if (!matches) {
      throw new ConflictException(
        `The order must list each of the album's ${stored.size} photos exactly once.`,
      );
    }

    await this.mediaAssetsService.applyOrder(photoIds);
  }

  /**
   * Marks one album as the gallery's featured album, clearing whoever held it.
   *
   * Both writes happen here rather than being left to the caller, because an
   * interface that can set the flag without clearing the old one will
   * eventually be used that way, and two featured albums is a gallery with two
   * lead slots and one place to put them.
   */
  async setFeatured(albumId: string): Promise<AlbumDocument | null> {
    await this.assertAlbum(albumId);
    await this.repository.clearFeatured(albumId);
    return this.repository.updateById(albumId, { isFeatured: true });
  }

  /** @throws NotFoundException when `id` references no album. */
  private async assertAlbum(id: string): Promise<AlbumDocument> {
    const album = await this.repository.findById(id);
    if (!album) {
      throw new NotFoundException(`Album ${id} not found.`);
    }
    return album;
  }

  async findAll(): Promise<AlbumDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AlbumDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole path from `Draft`/`Archived` to `Published` — gated by a
   *  dedicated `Publish` permission at the controller, never by generic
   *  update access. Server-sets `publishedAt`/`publishedBy`; never accepts
   *  them from a request body. */
  async publish(id: string, publishedBy: Types.ObjectId): Promise<AlbumDocument | null> {
    return this.repository.updateById(id, {
      publicationState: 'Published',
      publishedAt: new Date(),
      publishedBy,
    });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AlbumDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** The individual public album page: `null` (not a thrown error) when
   *  `slug` doesn't resolve to a `Published` album, mirroring
   *  `AthleteProfilesService.getPublicBySlug()`'s convention — the caller
   *  maps that to a 404. Otherwise returns the album's public-safe shape,
   *  one page of its visible photos in display order, and a "related albums"
   *  strip ranked by how closely each one is related. */
  async getPublicBySlug(slug: string, skip = 0): Promise<AlbumDetailPageResponseDto | null> {
    const album = await this.repository.findPublishedBySlug(slug);
    if (!album) {
      return null;
    }
    const [photos, related] = await Promise.all([
      this.mediaAssetsService.findPublicPageByAlbum(album._id, skip, ALBUM_PHOTO_PAGE_SIZE),
      this.repository.findRelated(album, ALBUM_RELATED_LIMIT),
    ]);
    return {
      album: this.toPublicResponse(album),
      mediaAssets: photos.items,
      photoTotal: photos.total,
      photoSkip: skip,
      relatedAlbums: related.map((relatedAlbum) => this.toRelatedSummary(relatedAlbum)),
    };
  }

  /** Maps a full `Album` document to its public-safe shape (excludes
   *  the audit-trail fields from `BaseSchema`). */
  toPublicResponse(album: AlbumDocument): AlbumPublicResponseDto {
    return {
      id: album._id.toString(),
      title: album.title,
      slug: album.slug,
      description: album.description,
      championshipId: album.championshipId?.toString() ?? null,
      competitionId: album.competitionId?.toString() ?? null,
      publicEventId: album.publicEventId?.toString() ?? null,
      athleteIds: album.athleteIds.map((id) => id.toString()),
      clubIds: album.clubIds.map((id) => id.toString()),
      eventDate: album.eventDate,
      location: album.location,
      isFeatured: album.isFeatured,
      championshipName: album.championshipName,
      coverImageId: album.coverImageId ? album.coverImageId.toString() : null,
      publishedAt: album.publishedAt,
      tags: album.tags,
      assetCount: album.assetCount,
    };
  }

  private toRelatedSummary(album: AlbumDocument): RelatedAlbumSummaryDto {
    return {
      id: album._id.toString(),
      title: album.title,
      slug: album.slug,
      coverImageId: album.coverImageId ? album.coverImageId.toString() : null,
      publishedAt: album.publishedAt,
    };
  }

  private cleanTags(tags: string[] | undefined): string[] {
    if (!tags) {
      return [];
    }
    const cleaned = new Set<string>();
    for (const tag of tags) {
      const trimmed = tag.trim().slice(0, ALBUM_MAX_TAG_LENGTH);
      if (trimmed.length > 0) {
        cleaned.add(trimmed);
      }
      if (cleaned.size >= ALBUM_MAX_TAGS) {
        break;
      }
    }
    return [...cleaned];
  }
}
