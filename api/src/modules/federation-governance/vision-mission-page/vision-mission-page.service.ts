import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { VisionMissionPagesRepository } from './vision-mission-page.repository.js';
import type { VisionMissionPageDocument } from './schemas/vision-mission-page.schema.js';
import { CreateVisionMissionPageDto } from './dto/create-vision-mission-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/** Implements: visionMissionPage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a). */
@Injectable()
export class VisionMissionPagesService {
  constructor(
    private readonly repository: VisionMissionPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreateVisionMissionPageDto): Promise<VisionMissionPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }

    return this.repository.create({
      federationId: new Types.ObjectId(dto.federationId),
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      visionText: dto.visionText,
      missionText: dto.missionText,
      strategicGoals: dto.strategicGoals ?? [],
      coreValues: dto.coreValues ?? [],
      revisionId: null,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<VisionMissionPageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<VisionMissionPageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('visionMissionPage', new Types.ObjectId(id));
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('visionMissionPage', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VisionMissionPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
