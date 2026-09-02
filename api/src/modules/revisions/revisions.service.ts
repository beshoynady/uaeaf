import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { RevisionsRepository } from './revisions.repository.js';
import type { RevisionDocument } from './schemas/revision.schema.js';
import type { PublicationEntityType } from '../../common/constants/workflow-entity-types.js';

/**
 * Implements: revisions collection, Domain 7 (FigJam node `100:7620`).
 * Immutable, permanent history — see `revisions.repository.ts` for why
 * this service (and its repository) exposes no update or delete method of
 * any kind, ever.
 */
@Injectable()
export class RevisionsService {
  constructor(private readonly repository: RevisionsRepository) {}

  /** `versionNumber` auto-increments from the entity's latest existing
   *  revision (1 if none exists yet) — the caller never supplies it. */
  async create(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    snapshotData: Record<string, unknown>;
    createdBy: Types.ObjectId;
  }): Promise<RevisionDocument> {
    const latest = await this.repository.findLatest(input.entityType, input.entityId);
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    return this.repository.create({ ...input, versionNumber });
  }

  async findById(id: string): Promise<RevisionDocument | null> {
    return this.repository.findById(id);
  }

  async findLatest(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<RevisionDocument | null> {
    return this.repository.findLatest(entityType, entityId);
  }

  /**
   * BE-PLAN-010 Week 2 §10 (HardDelete gate): an entity in the
   * revision/publication list can only be HardDeleted while it has ZERO
   * `revisions` rows — even one, however old, blocks it. This is an
   * additional business-rule gate on top of (not a replacement for)
   * `permissions.action='HardDelete'` RBAC authorization; a future entity
   * module (Week 3/4) calls this before performing its own HardDelete.
   *
   * @throws ForbiddenException when at least one revision exists.
   */
  async assertHardDeletable(entityType: PublicationEntityType, entityId: Types.ObjectId): Promise<void> {
    const count = await this.repository.countForEntity(entityType, entityId);
    if (count > 0) {
      throw new ForbiddenException(
        `Cannot HardDelete ${entityType} ${entityId.toString()}: ${count} revision(s) exist. Archive is the only available option once any revision has been created.`,
      );
    }
  }
}
