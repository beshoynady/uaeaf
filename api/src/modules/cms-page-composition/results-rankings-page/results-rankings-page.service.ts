import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { ResultsRankingsPageRepository } from './results-rankings-page.repository.js';
import type { ResultsRankingsPageDocument } from './schemas/results-rankings-page.schema.js';
import { UpsertResultsRankingsPageDto } from './dto/upsert-results-rankings-page.dto.js';

/** Implements: resultsRankingsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8): `upsert()` updates the single row rather than
 *  ever inserting a second one — see `SingletonPageService`. */
@Injectable()
export class ResultsRankingsPageService extends SingletonPageService<ResultsRankingsPageDocument> {
  constructor(
    repository: ResultsRankingsPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertResultsRankingsPageDto): Promise<ResultsRankingsPageDocument> {
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
