import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { CoachesPageRepository } from './coaches-page.repository.js';
import type { CoachesPageDocument } from './schemas/coaches-page.schema.js';
import { UpsertCoachesPageDto } from './dto/upsert-coaches-page.dto.js';

/** Implements: coachesPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8): `upsert()` updates the single row rather than
 *  ever inserting a second one — see `SingletonPageService`. */
@Injectable()
export class CoachesPageService extends SingletonPageService<CoachesPageDocument> {
  constructor(
    repository: CoachesPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertCoachesPageDto): Promise<CoachesPageDocument> {
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
