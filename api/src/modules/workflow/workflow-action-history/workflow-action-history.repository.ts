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
   * Every action across several instances, newest first — the order the
   * dashboard's timeline reads in, where the decision that explains the
   * current state is the one at the top.
   *
   * Capped rather than unbounded: this is read on every open of the status
   * panel. The cap is far above any real review — a record reaching it has
   * had a hundred decisions taken on it — and the DTO says so rather than
   * truncating silently.
   */
  async findByInstances(
    workflowInstanceIds: readonly Types.ObjectId[],
    limit = 100,
  ): Promise<WorkflowActionHistoryDocument[]> {
    if (workflowInstanceIds.length === 0) {
      return [];
    }
    return this.model
      .find({ workflowInstanceId: { $in: workflowInstanceIds }, archivedAt: null })
      .sort({ actionDate: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Whether this actor has already approved this step in the current cycle.
   *
   * Shares its cycle boundary with `countDistinctApprovers` by delegating to
   * it — two definitions of "the current cycle" would eventually disagree, and
   * the disagreement would show as a reviewer being asked twice for the same
   * decision, or never being asked at all.
   */
  async hasApprovedInCurrentCycle(
    workflowInstanceId: Types.ObjectId,
    workflowStepId: Types.ObjectId,
    actorId: Types.ObjectId,
  ): Promise<boolean> {
    const cycleStart = await this.model
      .findOne({ workflowInstanceId, action: { $in: ['Submitted', 'Resubmitted'] } })
      .sort({ actionDate: -1 })
      .exec();

    const approval = await this.model
      .findOne({
        workflowInstanceId,
        workflowStepId,
        actorId,
        action: 'Approved',
        ...(cycleStart ? { actionDate: { $gt: cycleStart.actionDate } } : {}),
      })
      .exec();

    return approval !== null;
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
