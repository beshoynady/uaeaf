import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { CommitteesPagesRepository } from './committees-page.repository.js';
import type { CommitteesPageDocument } from './schemas/committees-page.schema.js';
import { UpsertCommitteesPageDto } from './dto/upsert-committees-page.dto.js';

/** Implements: committeesPage collection, Domain 1 — Federation &
 *  Governance. Singleton (decision #8) — see `SingletonPageService`. */
@Injectable()
export class CommitteesPagesService extends SingletonPageService<CommitteesPageDocument> {
  constructor(
    repository: CommitteesPagesRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  async upsert(dto: UpsertCommitteesPageDto): Promise<CommitteesPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }
    return this.upsertDocument({
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      introHeading: dto.introHeading,
      introText: dto.introText,
    });
  }
}
