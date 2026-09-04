import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { StrategicPlansPagesRepository } from './strategic-plans-page.repository.js';
import type { StrategicPlansPageDocument } from './schemas/strategic-plans-page.schema.js';
import { CreateStrategicPlansPageDto } from './dto/create-strategic-plans-page.dto.js';
import { PublicationsService } from '../publications/publications.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';

/** Implements: strategicPlansPage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a).
 *
 *  Per confirmed decision #5, `documentId` is an attached file: no
 *  documents-side approval cycle is triggered from here. */
@Injectable()
export class StrategicPlansPagesService {
  constructor(
    private readonly repository: StrategicPlansPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreateStrategicPlansPageDto): Promise<StrategicPlansPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }

    return this.repository.create({
      federationId: new Types.ObjectId(dto.federationId),
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      introHeading: dto.introHeading,
      introText: dto.introText,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      foundationPillars: dto.foundationPillars ?? [],
      strategicAxes: dto.strategicAxes ?? [],
      objectives: dto.objectives ?? [],
      impactMetrics: dto.impactMetrics ?? [],
      documentId: dto.documentId ? new Types.ObjectId(dto.documentId) : null,
      documentVersion: dto.documentVersion ?? null,
      revisionId: null,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<StrategicPlansPageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<StrategicPlansPageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('strategicPlansPage', new Types.ObjectId(id));
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('strategicPlansPage', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<StrategicPlansPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
