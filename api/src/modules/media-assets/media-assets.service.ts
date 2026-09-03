import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center (FigJam
 *  node `92:7269`). Plain CRUD. */
@Injectable()
export class MediaAssetsService {
  constructor(private readonly repository: MediaAssetsRepository) {}

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
    return this.repository.create({
      albumId: dto.albumId ? new Types.ObjectId(dto.albumId) : null,
      file: dto.file,
      caption: dto.caption,
      altText: dto.altText,
    });
  }

  async findAll(): Promise<MediaAssetDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<MediaAssetDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<MediaAssetDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
