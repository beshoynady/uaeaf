import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommitteesRepository } from './committees.repository.js';
import type { CommitteeDocument } from './schemas/committees.schema.js';
import { CreateCommitteeDto } from './dto/create-committees.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';

/** Implements: committees collection, Domain 1 — Federation & Governance.
 *  Workflow-governed (List A + List B) — wired exactly like Week 3's
 *  `DocumentsService` mode (a): the public read path goes through
 *  `publications → revisions.snapshotData`, and HardDelete is gated on
 *  having zero revisions. */
@Injectable()
export class CommitteesService {
  constructor(
    private readonly repository: CommitteesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
  ) {}

  async create(dto: CreateCommitteeDto): Promise<CommitteeDocument> {
    return this.repository.create({
      name: dto.name,
      description: dto.description,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive ?? true,
      committeeType: dto.committeeType,
      committeeGroup: dto.committeeGroup,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<CommitteeDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<CommitteeDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule).
   *  `null` when there is no current Live publication. */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('committees', new Types.ObjectId(id));
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('committees', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<CommitteeDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
