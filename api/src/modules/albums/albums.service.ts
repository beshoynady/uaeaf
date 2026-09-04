import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlbumsRepository } from './albums.repository.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** `tags[]` cleanup bounds. Confirmed final (2026-09-03) — not a
 *  placeholder. */
export const ALBUM_MAX_TAGS = 20;
export const ALBUM_MAX_TAG_LENGTH = 40;

/** Implements: albums collection, Domain 5 — Media Center (FigJam node
 *  `92:7224`). `publicationState` is self-published by Media Center staff,
 *  with no Domain 7 Workflow gate (see the schema's doc comment). */
@Injectable()
export class AlbumsService {
  constructor(
    private readonly repository: AlbumsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws NotFoundException when `dto.coverImageId` doesn't reference an
   *  existing, non-archived `MediaAsset`, via `MediaAssetsService`.
   *  @throws ConflictException when that asset isn't an image type, or
   *  `dto.slug` is already taken. */
  async create(dto: CreateAlbumDto): Promise<AlbumDocument> {
    if (dto.coverImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.coverImageId);
    }

    try {
      return await this.repository.create({
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        contentCategoryId: new Types.ObjectId(dto.contentCategoryId),
        associations: (dto.associations ?? []).map((association) => ({
          ownerType: association.ownerType,
          ownerId: new Types.ObjectId(association.ownerId),
          role: association.role ?? 'Related',
          displayOrder: association.displayOrder ?? 0,
        })),
        coverImageId: dto.coverImageId ? new Types.ObjectId(dto.coverImageId) : null,
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
