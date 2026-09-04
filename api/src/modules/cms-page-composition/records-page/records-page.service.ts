import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { RecordsPageRepository } from './records-page.repository.js';
import type { RecordsPageDocument } from './schemas/records-page.schema.js';
import { UpsertRecordsPageDto } from './dto/upsert-records-page.dto.js';

/** Implements: recordsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8): `upsert()` updates the single row rather than
 *  ever inserting a second one — see `SingletonPageService`. */
@Injectable()
export class RecordsPageService extends SingletonPageService<RecordsPageDocument> {
  constructor(
    repository: RecordsPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertRecordsPageDto): Promise<RecordsPageDocument> {
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
