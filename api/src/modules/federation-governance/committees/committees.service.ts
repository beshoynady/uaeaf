import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommitteesRepository } from './committees.repository.js';
import type { CommitteeDocument } from './schemas/committees.schema.js';
import { CreateCommitteeDto } from './dto/create-committees.dto.js';
import { UpdateCommitteeDto } from './dto/update-committees.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { CommitteeHierarchyService } from './committee-hierarchy.service.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

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
    private readonly hierarchyService: CommitteeHierarchyService,
  ) {}

  async create(dto: CreateCommitteeDto): Promise<CommitteeDocument> {
    await this.assertSlugFree(dto.slug, null);
    await this.hierarchyService.assertPlacementAllowed({
      id: null,
      kind: dto.kind ?? null,
      parentCommitteeId: dto.parentCommitteeId ?? null,
    });

    return this.repository.create({
      name: dto.name,
      description: dto.description,
      slug: dto.slug,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive ?? true,
      committeeType: dto.committeeType,
      committeeGroup: dto.committeeGroup,
      publicationState: dto.publicationState,
      summary: dto.summary ?? null,
      about: dto.about ?? null,
      duties: dto.duties ?? [],
      formationDecision: dto.formationDecision
        ? {
            number: dto.formationDecision.number,
            date: new Date(dto.formationDecision.date),
            documentId: dto.formationDecision.documentId
              ? new Types.ObjectId(dto.formationDecision.documentId)
              : null,
          }
        : null,
      documentIds: (dto.documentIds ?? []).map((documentId) => new Types.ObjectId(documentId)),
      isVisible: dto.isVisible ?? true,
      kind: dto.kind ?? null,
      parentCommitteeId: dto.parentCommitteeId ? new Types.ObjectId(dto.parentCommitteeId) : null,
    });
  }

  async findAll(): Promise<CommitteeDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<CommitteeDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * Saves the draft row directly — same as `ArticlesService.update()`.
   * `committees` is workflow-governed, but a revision is a snapshot
   * `RevisionsService` freezes at submit/publish time (via
   * `PublishingService`), not something this plain field edit creates.
   *
   * @throws NotFoundException when no such committee exists.
   * @throws ConflictException when another live committee holds the new slug.
   */
  async update(id: string, dto: UpdateCommitteeDto): Promise<CommitteeDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Committee ${id} not found.`);
    }

    if (dto.slug !== undefined) {
      await this.assertSlugFree(dto.slug, existing._id as Types.ObjectId);
    }

    // The guard judges the committee's resulting shape, so a PATCH that
    // touches only one of kind/parentCommitteeId is checked against the
    // other one's current, unchanged value.
    const kind = dto.kind !== undefined ? dto.kind : existing.kind;
    const parentCommitteeId =
      dto.parentCommitteeId !== undefined
        ? dto.parentCommitteeId
        : existing.parentCommitteeId
          ? existing.parentCommitteeId.toString()
          : null;
    await this.hierarchyService.assertPlacementAllowed({ id, kind, parentCommitteeId });

    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Committee ${id} not found.`);
    }
    return updated;
  }

  /** @throws ConflictException when another live committee holds the slug. */
  private assertSlugFree = async (slug: string, selfId: Types.ObjectId | null): Promise<void> => {
    const holder = await this.repository.findOne({ slug });
    if (holder && (!selfId || (holder._id as Types.ObjectId).toString() !== selfId.toString())) {
      throw new ConflictException(`Slug "${slug}" is already in use.`);
    }
  };

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

  async unarchive(id: string): Promise<CommitteeDocument | null> {
    return this.repository.restore(id);
  }
}
