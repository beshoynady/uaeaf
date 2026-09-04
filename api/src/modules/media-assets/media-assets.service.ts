import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
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
      file: { ...dto.file, checksum: null },
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
}
