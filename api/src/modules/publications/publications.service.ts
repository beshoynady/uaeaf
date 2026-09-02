import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PublicationsRepository } from './publications.repository.js';
import type { PublicationDocument } from './schemas/publication.schema.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import type { PublicationEntityType } from '../../common/constants/workflow-entity-types.js';

/**
 * Implements: publications collection, Domain 7 (FigJam node `100:7671`).
 *
 * `publish()` is called internally by `WorkflowInstancesService` the
 * moment a final workflow step is approved on an Add/Edit operation —
 * there is no separate "now publish it" endpoint (BE-PLAN-010 Week 2 §5).
 *
 * `unpublish()` and `archive()` are genuinely different service-layer
 * operations, not the same code path with a different enum value (§6):
 * Unpublish is a simple, reversible status flip (no new approval cycle to
 * return to Live); Archive is the permanent end-state. Archive is allowed
 * from either Live or Unpublished; Unpublish is only allowed from Live.
 */
@Injectable()
export class PublicationsService {
  constructor(
    private readonly repository: PublicationsRepository,
    private readonly revisionsService: RevisionsService,
  ) {}

  async publish(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    revisionId: Types.ObjectId;
    workflowInstanceId: Types.ObjectId | null;
    publishedBy: Types.ObjectId;
  }): Promise<PublicationDocument> {
    return this.repository.createLive({ ...input, publishedAt: new Date() });
  }

  /** @throws ConflictException when the publication is not currently Live
   *  (including when it doesn't exist at all). */
  async unpublish(id: string): Promise<PublicationDocument | null> {
    const updated = await this.repository.updateStatusIf(id, 'Live', 'Unpublished');
    if (!updated) {
      throw new ConflictException('Only a Live publication can be unpublished.');
    }
    return updated;
  }

  /** @throws ConflictException when the publication is already Archived.
   *  Returns `null` (no throw) when it doesn't exist at all, matching the
   *  original find-then-update's behavior for a missing id. */
  async archive(id: string): Promise<PublicationDocument | null> {
    const updated = await this.repository.updateStatusIf(id, { $ne: 'Archived' }, 'Archived');
    if (updated) {
      return updated;
    }
    const existing = await this.repository.findById(id);
    if (existing?.status === 'Archived') {
      throw new ConflictException('This publication is already Archived.');
    }
    return null;
  }

  /**
   * BE-PLAN-010 Week 2 §3: the sole, structural public read path — the
   * live content behind "articles" etc. is reached only through
   * `publications → revisions.snapshotData`, never by reading the
   * entity's own collection directly. Returns `null` when the entity has
   * no current Live publication.
   */
  async getPublicSnapshot(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<Record<string, unknown> | null> {
    const publication = await this.repository.findLive(entityType, entityId);
    if (!publication) {
      return null;
    }
    const revision = await this.revisionsService.findById(publication.revisionId.toString());
    return revision?.snapshotData ?? null;
  }
}
