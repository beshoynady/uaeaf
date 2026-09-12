import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Revision } from './schemas/revision.schema.js';
import type { RevisionDocument } from './schemas/revision.schema.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';

/**
 * Implements: revisions collection, Domain 7. Deliberately does NOT extend
 * `BaseRepository` — `revisions` rows are immutable and permanent (no
 * `updatedAt`/`archivedAt` fields exist on the schema, see
 * `revision.schema.ts`), so this repository exposes no update, no soft
 * delete, and no hard delete of any kind. Only `create` and reads.
 */
@Injectable()
export class RevisionsRepository {
  constructor(@InjectModel(Revision.name) private readonly model: Model<RevisionDocument>) {}

  async create(data: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    versionNumber: number;
    snapshotData: Record<string, unknown>;
    createdBy: Types.ObjectId;
  }): Promise<RevisionDocument> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<RevisionDocument | null> {
    return this.model.findById(id).exec();
  }

  async findLatest(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<RevisionDocument | null> {
    return this.model.findOne({ entityType, entityId }).sort({ versionNumber: -1 }).exec();
  }

  async countForEntity(entityType: PublicationEntityType, entityId: Types.ObjectId): Promise<number> {
    return this.model.countDocuments({ entityType, entityId }).exec();
  }

  /**
   * One page of a record's history, newest first, without the snapshots.
   *
   * The skip and limit are applied in the database, not to an in-memory
   * slice, so a record with a thousand versions costs the same to read as
   * one with ten. `total` is counted separately: the page alone cannot say
   * how far the history goes.
   *
   * `snapshotData` is projected out on purpose: a page of fifty versions
   * would otherwise send fifty full documents to draw a list of dates. The
   * reader opens one version at a time, and `findById` fetches that one.
   *
   * Served by the existing `{entityType, entityId, versionNumber: -1}`
   * index, which is already sorted the way this reads.
   */
  async findForEntity(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    skip: number,
    limit: number,
  ): Promise<{ items: RevisionListRow[]; total: number }> {
    const filter = { entityType, entityId };
    const [items, total] = await Promise.all([
      this.model
        .find(filter, { snapshotData: 0 })
        .sort({ versionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean<RevisionListRow[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}

/** One row of a record's history — everything but the snapshot itself. */
export interface RevisionListRow {
  _id: Types.ObjectId;
  entityType: PublicationEntityType;
  entityId: Types.ObjectId;
  versionNumber: number;
  createdAt: Date;
  createdBy: Types.ObjectId;
}
