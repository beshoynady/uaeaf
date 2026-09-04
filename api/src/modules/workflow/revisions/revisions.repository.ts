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
}
