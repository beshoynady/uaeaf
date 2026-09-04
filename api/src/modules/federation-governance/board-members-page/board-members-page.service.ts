import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { BoardMembersPageRepository } from './board-members-page.repository.js';
import type { BoardMembersPageDocument } from './schemas/board-members-page.schema.js';
import { UpsertBoardMembersPageDto } from './dto/upsert-board-members-page.dto.js';

/** Implements: boardMembersPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8): `upsert()` updates the single row rather than
 *  ever inserting a second one — see `SingletonPageService`. */
@Injectable()
export class BoardMembersPageService extends SingletonPageService<BoardMembersPageDocument> {
  constructor(
    repository: BoardMembersPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertBoardMembersPageDto): Promise<BoardMembersPageDocument> {
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
