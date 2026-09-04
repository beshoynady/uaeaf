import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PagesRepository } from './pages.repository.js';
import type { PageDocument } from './schemas/pages.schema.js';
import { CreatePageDto } from './dto/create-pages.dto.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** Implements: pages collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class PagesService {
  constructor(
    private readonly repository: PagesRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws ConflictException when `slug` is already taken. */
  async create(dto: CreatePageDto): Promise<PageDocument> {
    if (dto.seo?.ogImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.seo.ogImageId);
    }

    try {
      return await this.repository.create({
        slug: dto.slug,
        title: dto.title,
        status: dto.status,
        seo: dto.seo
          ? {
              metaTitle: dto.seo.metaTitle ?? null,
              metaDescription: dto.seo.metaDescription ?? null,
              ogImageId: dto.seo.ogImageId ? new Types.ObjectId(dto.seo.ogImageId) : null,
            }
          : null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'slug'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<PageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<PageDocument | null> {
    return this.repository.findById(id);
  }

  /** Public routing lookup: only a `Published` page resolves. Returns
   *  `null` for an unknown or still-Draft slug, so the route 404s. */
  async findPublishedBySlug(slug: string): Promise<PageDocument | null> {
    return this.repository.findOne({ slug, status: 'Published' });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<PageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
