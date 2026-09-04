import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Publication } from './schemas/publication.schema.js';
import type { PublicationDocument, PublicationStatus } from './schemas/publication.schema.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';

/** Implements: publications collection, Domain 7. */
@Injectable()
export class PublicationsRepository extends BaseRepository<PublicationDocument> {
  constructor(@InjectModel(Publication.name) model: Model<PublicationDocument>) {
    super(model);
  }

  /** The current `status='Live'` publication for an entity — the sole,
   *  structural source for public-facing reads (BE-PLAN-010 Week 2 §3).
   *  At most one `Live` row exists per (entityType, entityId) at any time
   *  (confirmed 2026-09-03 — see `createLive()`), so a plain `findOne`
   *  needs no sort/tiebreak. */
  async findLive(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<PublicationDocument | null> {
    return this.findOne({ entityType, entityId, status: 'Live' });
  }

  /** Creates a new `Live` publications row for (entityType, entityId),
   *  first retiring any existing `Live` row(s) for that same entity to
   *  `Archived` — enforces the confirmed invariant that at most one `Live`
   *  row exists per entity at any time (2026-09-03; an earlier assumption
   *  that multiple `Live` rows could coexist across republish cycles was
   *  never an approved decision and has been corrected).
   *
   *  The retire runs before the insert, and this MongoDB instance is
   *  standalone (not a replica set), so this is not a single ACID
   *  transaction across the two writes — a `findLive()` racing exactly
   *  between them would briefly see zero `Live` rows, never two, which is
   *  the safe direction for this invariant. */
  async createLive(data: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    revisionId: Types.ObjectId;
    workflowInstanceId: Types.ObjectId | null;
    publishedBy: Types.ObjectId;
    publishedAt: Date;
  }): Promise<PublicationDocument> {
    await this.model.updateMany(
      { entityType: data.entityType, entityId: data.entityId, status: 'Live', archivedAt: null },
      { status: 'Archived' },
    );
    return this.create({ ...data, status: 'Live' });
  }

  /** Atomically flips `status` to `newStatus` only if the document's
   *  current status satisfies `condition` — a single round trip that
   *  closes the read-then-write race a separate find+check+update would
   *  leave open. Returns `null` when no document matched (either it
   *  doesn't exist or its status didn't qualify); the caller distinguishes
   *  those cases itself where that distinction matters (see
   *  PublicationsService.archive()). */
  async updateStatusIf(
    id: string,
    condition: PublicationStatus | { $ne: PublicationStatus },
    newStatus: PublicationStatus,
  ): Promise<PublicationDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, status: condition, archivedAt: null },
        { status: newStatus },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
