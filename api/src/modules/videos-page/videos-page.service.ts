import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { VideosPageRepository } from './videos-page.repository.js';
import type { VideosPageDocument } from './schemas/videos-page.schema.js';
import { UpsertVideosPageDto } from './dto/upsert-videos-page.dto.js';

/** Implements: videosPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: `upsert()` updates the single row rather than ever inserting
 *  a second one — see `SingletonPageService`. */
@Injectable()
export class VideosPageService extends SingletonPageService<VideosPageDocument> {
  constructor(
    repository: VideosPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertVideosPageDto): Promise<VideosPageDocument> {
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
