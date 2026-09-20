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
    revisionRequested?: boolean;
  }): Promise<WorkflowActionHistoryDocument> {
    // Defaulted here rather than left to the schema so the stored row says
    // "a final refusal" explicitly, instead of saying nothing and being read
    // as one.
    return this.repository.create({ ...input, revisionRequested: input.revisionRequested ?? false });
  }

  async findByInstance(workflowInstanceId: string): Promise<WorkflowActionHistoryDocument[]> {
    return this.repository.findByInstance(new Types.ObjectId(workflowInstanceId));
  }

  /** Every action across several instances, newest first — one record's
   *  whole decision history, for the dashboard's timeline. */
  async findByInstances(
    workflowInstanceIds: readonly Types.ObjectId[],
  ): Promise<WorkflowActionHistoryDocument[]> {
    return this.repository.findByInstances(workflowInstanceIds);
  }

  /** Distinct actors who approved `workflowStepId` in the instance's current
   *  submission cycle — WorkflowInstancesService uses this to decide whether
   *  a step's `requiredApprovals` threshold is met. See the repository for
   *  where a cycle starts. */
  async countDistinctApprovers(
    workflowInstanceId: Types.ObjectId,
    workflowStepId: Types.ObjectId,
  ): Promise<number> {
    return this.repository.countDistinctApprovers(workflowInstanceId, workflowStepId);
  }
}
