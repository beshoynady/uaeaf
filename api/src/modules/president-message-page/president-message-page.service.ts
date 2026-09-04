import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PresidentMessagePagesRepository } from './president-message-page.repository.js';
import type { PresidentMessagePageDocument } from './schemas/president-message-page.schema.js';
import { CreatePresidentMessagePageDto } from './dto/create-president-message-page.dto.js';
import { PublicationsService } from '../workflow/publications/publications.service.js';
import { RevisionsService } from '../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';

/** Implements: presidentMessagePage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a).
 *
 *  Per confirmed decision #4, `signatoryName`/`signatoryTitle` are stored
 *  exactly as supplied (display snapshots) and are never derived from, nor
 *  used to resolve, the canonical `federationAppointmentId` chain. */
@Injectable()
export class PresidentMessagePagesService {
  constructor(
    private readonly repository: PresidentMessagePagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreatePresidentMessagePageDto): Promise<PresidentMessagePageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }

    return this.repository.create({
      federationAppointmentId: new Types.ObjectId(dto.federationAppointmentId),
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      goals: dto.goals ?? [],
      messageBody: dto.messageBody,
      signatoryName: dto.signatoryName,
      signatoryTitle: dto.signatoryTitle,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<PresidentMessagePageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<PresidentMessagePageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot(
      'presidentMessagePage',
      new Types.ObjectId(id),
    );
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('presidentMessagePage', new Types.ObjectId(id));
  }

  async remove(
    id: string,
    archivedBy: Types.ObjectId,
  ): Promise<PresidentMessagePageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
