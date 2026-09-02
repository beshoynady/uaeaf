import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { WorkflowActionHistory } from './schemas/workflow-action-history.schema.js';
import type { WorkflowActionHistoryDocument } from './schemas/workflow-action-history.schema.js';

/** Implements: workflowActionHistory collection, Domain 7. */
@Injectable()
export class WorkflowActionHistoryRepository extends BaseRepository<WorkflowActionHistoryDocument> {
  constructor(@InjectModel(WorkflowActionHistory.name) model: Model<WorkflowActionHistoryDocument>) {
    super(model);
  }

  async findByInstance(workflowInstanceId: Types.ObjectId): Promise<WorkflowActionHistoryDocument[]> {
    return this.model.find({ workflowInstanceId, archivedAt: null }).sort({ actionDate: 1 }).exec();
  }

  /** Distinct actors who have already recorded `action='Approved'` against
   *  `workflowStepId` within `workflowInstanceId` — used to evaluate a
   *  Parallel step's `requiredApprovals` threshold. */
  async countDistinctApprovers(
    workflowInstanceId: Types.ObjectId,
    workflowStepId: Types.ObjectId,
  ): Promise<number> {
    const actorIds = await this.model.distinct('actorId', {
      workflowInstanceId,
      workflowStepId,
      action: 'Approved',
    });
    return actorIds.length;
  }
}
