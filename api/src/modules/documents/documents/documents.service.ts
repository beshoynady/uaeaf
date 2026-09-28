import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentsRepository } from './documents.repository.js';
import type { DocumentDocument, DocumentOwnerType } from './schemas/document.schema.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { partialUpdate, setObjectIdField, setDateField } from '../../../common/utils/partial-update.util.js';

/**
 * Implements: documents collection, Domain 6 (FigJam node `94:7374`).
 * `create()`/`findAll()`/`findById()`/`remove()` serve both usage modes
 * equally (a document row is a document row regardless of mode); the two
 * modes diverge only in how a document is subsequently reached —
 * `findByOwner()` for mode (b) generic attachment, `getPublicSnapshot()`/
 * `assertHardDeletable()` for mode (a) standalone Workflow-tracked
 * lifecycle (confirmed decision #6) — kept as distinct methods rather than
 * one conflated path.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly repository: DocumentsRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
  ) {}

  async create(dto: CreateDocumentDto): Promise<DocumentDocument> {
    return this.repository.create({
      file: dto.file,
      documentType: dto.documentType,
      ownerType: dto.ownerType ?? null,
      ownerId: dto.ownerId ? new Types.ObjectId(dto.ownerId) : null,
      effectiveDate: new Date(dto.effectiveDate),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<DocumentDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<DocumentDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * Saves the row directly — same as `ArticlesService.update()`. `documents`
   * is workflow-governed, but a revision is a snapshot `RevisionsService`
   * freezes at submit/publish time, not something this plain field edit
   * creates.
   *
   * @throws NotFoundException when no such document exists.
   */
  async update(id: string, dto: UpdateDocumentDto): Promise<DocumentDocument> {
    const update = partialUpdate(dto);
    // Schema nullability (Fix round 2 — read from `document.schema.ts`, not
    // inferred from the DTO): `ownerId`/`expiryDate` default to `null`;
    // `effectiveDate` is `required: true` and has no valid "no value" state.
    setObjectIdField(update, dto, 'ownerId', { nullable: true });
    setDateField(update, dto, 'effectiveDate', { nullable: false });
    setDateField(update, dto, 'expiryDate', { nullable: true });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Document ${id} not found.`);
    }
    return updated;
  }

  /** Mode (b): generic attachment lookup — e.g. every document attached to
   *  one club. */
  async findByOwner(ownerType: DocumentOwnerType, ownerId: string): Promise<DocumentDocument[]> {
    return this.repository.findByOwner(ownerType, new Types.ObjectId(ownerId));
  }

  /** Mode (a): the sole, structural public read path for a
   *  Workflow-tracked document (BE-PLAN-010 Week 2 §3) — reads through
   *  `publications → revisions.snapshotData`, never this collection's own
   *  row directly. Returns `null` when there is no current Live
   *  publication. */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('documents', new Types.ObjectId(id));
  }

  /** Mode (a): confirmed decision #10 (Week 2 HardDelete gate) — a
   *  document can only be HardDeleted while it has zero `revisions` rows.
   *  @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('documents', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<DocumentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<DocumentDocument | null> {
    return this.repository.restore(id);
  }
}
