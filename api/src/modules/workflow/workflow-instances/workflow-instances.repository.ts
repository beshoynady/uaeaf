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
}
