import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import { Album } from '../albums/schemas/album.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center (FigJam
 *  node `92:7269`). Plain CRUD, plus maintaining the parent album's
 *  denormalized `assetCount` (2026-09-04 media-gallery hardening pass).
 *
 *  Injects the `Album` Mongoose model directly rather than depending on
 *  `AlbumsService`/`AlbumsRepository`: `AlbumsModule` already imports
 *  `MediaAssetsModule` (for `assertUsableImage()`), so importing
 *  `AlbumsModule` back here would create a circular module dependency.
 *  Registering the same model+schema pair in a second module's
 *  `forFeature()` is safe — Mongoose reuses the already-compiled model
 *  for a given connection+name as long as the schema instance is
 *  reference-identical, which it is here (`AlbumSchema` is a singleton
 *  import from `album.schema.ts`). */
@Injectable()
export class MediaAssetsService {
  /** Ceiling on how many assets one anonymous request may resolve. A page
   *  never legitimately needs more; without it the endpoint is a free bulk
   *  export of the media table to anyone who can generate ObjectIds. */
  private static readonly PUBLIC_ID_LIMIT = 50;

  constructor(
    private readonly repository: MediaAssetsRepository,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
  ) {}

  /** Shared validation for every consumer that references a `MediaAsset`
   *  as a cover/profile image (`albums.coverImageId`, `athleteProfiles`/
   *  `officialProfiles.photoId`, ...) — one place enforcing "exists, not
   *  archived, actually an image" instead of each module hand-rolling it.
   *  @throws NotFoundException when `id` doesn't reference an existing,
   *  non-archived `MediaAsset`.
   *  @throws ConflictException when it exists but isn't an image type. */
  async assertUsableImage(id: string): Promise<void> {
    const asset = await this.findById(id);
    if (!asset) {
      throw new NotFoundException(`MediaAsset ${id} not found.`);
    }
    if (!asset.file.mimeType.startsWith('image/')) {
      throw new ConflictException(`MediaAsset ${id} is not a valid image type.`);
    }
  }

  async create(dto: CreateMediaAssetDto): Promise<MediaAssetDocument> {
    const asset = await this.repository.create({
      albumId: dto.albumId ? new Types.ObjectId(dto.albumId) : null,
      // checksum isn't accepted from the client (see MediaFileDto's
      // comment) -- always stored as null until an upload-time hashing
      // step exists.
      file: {
        ...dto.file,
        checksum: null,
        photographer: dto.file.photographer ?? null,
        captureDate: dto.file.captureDate ? new Date(dto.file.captureDate) : null,
      },
      caption: dto.caption,
      altText: dto.altText,
      displayOrder: dto.displayOrder,
      isVisible: dto.isVisible ?? true,
      isFeatured: dto.isFeatured ?? false,
    });
    if (asset.albumId) {
      await this.albumModel.updateOne({ _id: asset.albumId }, { $inc: { assetCount: 1 } }).exec();
    }
    return asset;
  }

  async findAll(): Promise<MediaAssetDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<MediaAssetDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<MediaAssetDocument | null> {
    const asset = await this.repository.softDelete(id, archivedBy);
    if (asset?.albumId) {
      await this.albumModel.updateOne({ _id: asset.albumId }, { $inc: { assetCount: -1 } }).exec();
    }
    return asset;
  }

  /** The individual public album page's photo grid: visible assets only,
   *  in display order, mapped to their public-safe shape (2026-09-04
   *  follow-on to ADR-0054). */
  async findPublicByAlbum(albumId: Types.ObjectId): Promise<MediaAssetPublicResponseDto[]> {
    const assets = await this.repository.findVisibleByAlbum(albumId);
    return assets.map((asset) => this.toPublicResponse(asset));
  }

  /**
   * Resolves media ids for the public site.
   *
   * Every one of the twelve public pages carries a `heroImageId` and the CMS
   * offers a picker for it, but every route on this controller required
   * `mediaAssets:Read` — so the public site could store the reference and
   * never render the image. Recorded as an API gap in ADR-0060 §7; approved
   * by the Product Owner on 2026-09-09.
   *
   * Batch rather than one-at-a-time because a single page references a hero
   * plus several section images, and N round trips on a server-rendered page
   * is N times the latency before first paint.
   *
   * Malformed ids are dropped rather than rejected: this endpoint is
   * reachable by anyone, so a bad id is an ordinary event, and a stale
   * reference left in a CMS field must not turn a visitor's page into a 500.
   */
  async findPublicByIds(ids: readonly string[]): Promise<MediaAssetPublicResponseDto[]> {
    const valid = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .slice(0, MediaAssetsService.PUBLIC_ID_LIMIT)
      .map((id) => new Types.ObjectId(id));
    if (valid.length === 0) {
      return [];
    }
    const assets = await this.repository.findVisibleByIds(valid);
    return assets.map((asset) => this.toPublicResponse(asset));
  }

  /** Maps a full `MediaAsset` document to its public-safe shape (excludes
   *  `albumId`, `isVisible`, and the internal `originalName`/`storageKey`/
   *  `checksum` file fields). */
  toPublicResponse(asset: MediaAssetDocument): MediaAssetPublicResponseDto {
    return {
      id: asset._id.toString(),
      file: {
        url: asset.file.url,
        mimeType: asset.file.mimeType,
        width: asset.file.width,
        height: asset.file.height,
        size: asset.file.size,
        photographer: asset.file.photographer,
        captureDate: asset.file.captureDate,
      },
      caption: asset.caption,
      altText: asset.altText,
      displayOrder: asset.displayOrder,
      isFeatured: asset.isFeatured,
    };
  }
}
