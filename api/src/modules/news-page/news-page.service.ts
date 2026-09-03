import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { NewsPageRepository } from './news-page.repository.js';
import type { NewsPageDocument } from './schemas/news-page.schema.js';
import { UpsertNewsPageDto } from './dto/upsert-news-page.dto.js';

/** Implements: newsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8): `upsert()` updates the single row rather than
 *  ever inserting a second one — see `SingletonPageService`. */
@Injectable()
export class NewsPageService extends SingletonPageService<NewsPageDocument> {
  constructor(
    repository: NewsPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertNewsPageDto): Promise<NewsPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }
    return this.upsertDocument({
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
    });
  }
}
