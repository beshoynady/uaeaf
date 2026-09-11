import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
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

  /**
   * Distinct actors who approved `workflowStepId` in the instance's current
   * cycle — what a step's `requiredApprovals` threshold is measured against.
   *
   * A cycle starts at the latest `Submitted` or `Resubmitted` action. An
   * approval given before a rejection or a return approved a text the author
   * has since replaced or been told to change, so it does not count toward
   * the one under review now — even when the same revision is resubmitted.
   *
   * Cycles are ordered by `actionDate`, which the server stamps on every row.
   */
  async countDistinctApprovers(
    workflowInstanceId: Types.ObjectId,
    workflowStepId: Types.ObjectId,
  ): Promise<number> {
    const cycleStart = await this.model
      .findOne({ workflowInstanceId, action: { $in: ['Submitted', 'Resubmitted'] } })
      .sort({ actionDate: -1 })
      .exec();
    const actorIds = await this.model.distinct('actorId', {
      workflowInstanceId,
      workflowStepId,
      action: 'Approved',
      ...(cycleStart ? { actionDate: { $gt: cycleStart.actionDate } } : {}),
    });
    return actorIds.length;
  }
}
