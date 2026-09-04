import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { AlbumsPageRepository } from './albums-page.repository.js';
import type { AlbumsPageDocument } from './schemas/albums-page.schema.js';
import { UpsertAlbumsPageDto } from './dto/upsert-albums-page.dto.js';

/** Implements: albumsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: `upsert()` updates the single row rather than ever inserting
 *  a second one — see `SingletonPageService`. */
@Injectable()
export class AlbumsPageService extends SingletonPageService<AlbumsPageDocument> {
  constructor(
    repository: AlbumsPageRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  /** @throws NotFoundException/ConflictException when `heroImageId` is not
   *  an existing, non-archived image (via `MediaAssetsService`). */
  async upsert(dto: UpsertAlbumsPageDto): Promise<AlbumsPageDocument> {
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
