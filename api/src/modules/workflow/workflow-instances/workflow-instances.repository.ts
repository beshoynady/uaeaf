import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { WorkflowInstance } from './schemas/workflow-instance.schema.js';
import type { WorkflowInstanceDocument } from './schemas/workflow-instance.schema.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';

/** Implements: workflowInstances collection, Domain 7. */
@Injectable()
export class WorkflowInstancesRepository extends BaseRepository<WorkflowInstanceDocument> {
  constructor(@InjectModel(WorkflowInstance.name) model: Model<WorkflowInstanceDocument>) {
    super(model);
  }

  /** The "active" instance for an entity, per BE-PLAN-010 Week 2 §4:
   *  not archived, and `status !== 'Approved'` (Rejected/Returned are NOT
   *  terminal — the same instance can still be resubmitted into). */
  async findActive(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.findOne({ entityType, entityId, status: { $ne: 'Approved' } });
  }

  /**
   * Every review this record has been through, including the finished ones.
   *
   * `findActive` deliberately excludes `Approved`, which is right for
   * deciding what may happen next and wrong for showing what happened: a
   * record published through an approval would otherwise present an empty
   * history the moment it went live. Served by the `{entityType, entityId}`
   * index the schema already declares.
   */
  async findByEntity(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument[]> {
    return this.find({ entityType, entityId });
  }
}
