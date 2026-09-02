import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowActionHistoryRepository } from './workflow-action-history.repository.js';
import type { WorkflowActionHistoryDocument, WorkflowAction } from './schemas/workflow-action-history.schema.js';

/** Implements: workflowActionHistory collection, Domain 7 (FigJam node
 *  `100:7563`). `record()` is called by WorkflowInstancesService for every
 *  action (Submitted/Resubmitted/Approved/Rejected/Returned/Delegated) —
 *  there is no public POST route, workflow actions are the only writer. */
@Injectable()
export class WorkflowActionHistoryService {
  constructor(private readonly repository: WorkflowActionHistoryRepository) {}

  async record(input: {
    workflowInstanceId: Types.ObjectId;
    workflowStepId: Types.ObjectId;
    actorId: Types.ObjectId;
    action: WorkflowAction;
    revisionId: Types.ObjectId;
    reason?: string | null;
    delegatedToUserId?: Types.ObjectId | null;
    returnedToStepId?: Types.ObjectId | null;
  }): Promise<WorkflowActionHistoryDocument> {
    return this.repository.create(input);
  }

  async findByInstance(workflowInstanceId: string): Promise<WorkflowActionHistoryDocument[]> {
    return this.repository.findByInstance(new Types.ObjectId(workflowInstanceId));
  }

  /** Distinct actors who have already approved `workflowStepId` within
   *  `workflowInstanceId` — WorkflowInstancesService uses this to decide
   *  whether a Parallel step's `requiredApprovals` threshold is met. */
  async countDistinctApprovers(
    workflowInstanceId: Types.ObjectId,
    workflowStepId: Types.ObjectId,
  ): Promise<number> {
    return this.repository.countDistinctApprovers(workflowInstanceId, workflowStepId);
  }
}
