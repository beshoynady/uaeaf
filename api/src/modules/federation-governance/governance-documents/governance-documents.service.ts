import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GovernanceDocumentsRepository } from './governance-documents.repository.js';
import type { GovernanceDocumentDocument } from './schemas/governance-documents.schema.js';
import { CreateGovernanceDocumentDto } from './dto/create-governance-documents.dto.js';
import { UpdateGovernanceDocumentDto } from './dto/update-governance-documents.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { DocumentsService } from '../../documents/documents/documents.service.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

/** Implements: governanceDocuments collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a).
 *
 *  Confirmed decision #5 — this wrapper is the sole workflow authority for
 *  the pair. `DocumentsService` is injected ONLY to verify the referenced
 *  file exists (reusing Week 3's service rather than re-querying the
 *  documents collection here); no documents-side workflow method is ever
 *  called, so the attached file never runs a second approval cycle. */
@Injectable()
export class GovernanceDocumentsService {
  constructor(
    private readonly repository: GovernanceDocumentsRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly documentsService: DocumentsService,
  ) {}

  /** @throws NotFoundException when `fileId` doesn't reference an existing,
   *  non-archived `documents` row. */
  async create(dto: CreateGovernanceDocumentDto): Promise<GovernanceDocumentDocument> {
    const file = await this.documentsService.findById(dto.fileId);
    if (!file) {
      throw new NotFoundException(`Document ${dto.fileId} not found.`);
    }

    return this.repository.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      fileId: new Types.ObjectId(dto.fileId),
      documentVersion: dto.documentVersion,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<GovernanceDocumentDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<GovernanceDocumentDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * Saves the row directly — same as `ArticlesService.update()`.
   * `governanceDocuments` is workflow-governed, but a revision is a
   * snapshot `RevisionsService` freezes at submit/publish time, not
   * something this plain field edit creates. `fileId` is not on
   * `UpdateGovernanceDocumentDto` at all (Fix round 1, CLAUDE.md §31) — no
   * filtering is needed here to keep it out; see that DTO for why.
   *
   * @throws NotFoundException when no such governance document exists.
   */
  async update(id: string, dto: UpdateGovernanceDocumentDto): Promise<GovernanceDocumentDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Governance document ${id} not found.`);
    }
    return updated;
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('governanceDocuments', new Types.ObjectId(id));
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('governanceDocuments', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<GovernanceDocumentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<GovernanceDocumentDocument | null> {
    return this.repository.restore(id);
  }
}
