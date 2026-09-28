import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PagesRepository } from './pages.repository.js';
import type { PageDocument } from './schemas/pages.schema.js';
import { CreatePageDto } from './dto/create-pages.dto.js';
import { UpdatePageDto } from './dto/update-pages.dto.js';
import type { PagePublicResponseDto } from './dto/page-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../../common/utils/mongo-errors.util.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

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

  /** Unlike `create()`, does not re-check a changed `seo.ogImageId` against
   *  `mediaAssetsService.assertUsableImage` — flagged as a scope decision
   *  rather than silently half-covered; see the task report. `seo` as a
   *  whole is nullable, and so is `ogImageId` within it (Fix round 2 — read
   *  from `pages.schema.ts`/`create()`'s own ternary).
   *  @throws NotFoundException when no such page exists.
   *  @throws ConflictException when the patch's `slug` is already taken. */
  async update(id: string, dto: UpdatePageDto): Promise<PageDocument> {
    const update = partialUpdate(dto);
    if (dto.seo !== undefined) {
      if (dto.seo === null) {
        update.seo = null;
      } else {
        const seo: Record<string, unknown> = {
          metaTitle: dto.seo.metaTitle ?? null,
          metaDescription: dto.seo.metaDescription ?? null,
        };
        setObjectIdField(seo, dto.seo, 'ogImageId', { nullable: true });
        update.seo = seo;
      }
    }

    let updated: PageDocument | null;
    try {
      updated = await this.repository.updateById(id, update);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'slug'}.`);
      }
      throw error;
    }
    if (!updated) {
      throw new NotFoundException(`Page ${id} not found.`);
    }
    return updated;
  }

  /** Public routing lookup: only a `Published` page resolves. Returns
   *  `null` for an unknown or still-Draft slug, so the route 404s.
   *  Returns the public-safe shape, never the raw document. */
  async findPublishedBySlug(slug: string): Promise<PagePublicResponseDto | null> {
    const page = await this.repository.findOne({ slug, status: 'Published' });
    return page ? this.toPublicResponse(page) : null;
  }

  /** Maps a full `Page` document to its public-safe shape (excludes the
   *  `status` routing gate and the `BaseSchema` audit trail — see the DTO's
   *  doc comment). */
  toPublicResponse(page: PageDocument): PagePublicResponseDto {
    return {
      id: page._id.toString(),
      slug: page.slug,
      title: page.title,
      seo: page.seo
        ? {
            metaTitle: page.seo.metaTitle,
            metaDescription: page.seo.metaDescription,
            ogImageId: page.seo.ogImageId ? page.seo.ogImageId.toString() : null,
          }
        : null,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<PageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<PageDocument | null> {
    return this.repository.restore(id);
  }
}
