import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';

export type WorkflowActionHistoryDocument = HydratedDocument<WorkflowActionHistory>;

export const WORKFLOW_ACTIONS = [
  'Submitted',
  'Resubmitted',
  'Approved',
  'Rejected',
  'Returned',
  'Delegated',
] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

/** Implements: workflowActionHistory collection, Domain 7 (FigJam node
 *  `100:7563`, re-read fresh 2026-09-02). `revisionId` (added 2026-09-01)
 *  is snapshotted per action, not just once on `workflowInstances` — a
 *  reject-then-resubmit sequence would otherwise silently lose which exact
 *  revision an approver reviewed at each step. `returnedToStepId` is
 *  populated only when `action='Returned'`. */
@Schema({ collection: 'workflowActionHistory', timestamps: true })
export class WorkflowActionHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'WorkflowInstance', required: true })
  workflowInstanceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WorkflowStep', required: true })
  workflowStepId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: WORKFLOW_ACTIONS, required: true })
  action: WorkflowAction;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  delegatedToUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WorkflowStep', default: null })
  returnedToStepId: Types.ObjectId | null;

  /**
   * Whether this rejection asked for a revision rather than ending the matter.
   *
   * Both outcomes leave the record in draft, and both restart the review from
   * its first step when it is resubmitted — one engine behaviour, so this flag
   * is the only thing that tells a reviewer's two intentions apart. A flag
   * rather than a new `action` value because `WORKFLOW_ACTIONS` is a closed
   * list the live board defines, and the engine does not act on the
   * difference.
   *
   * Meaningless unless `action === 'Rejected'`.
   */
  @Prop({ type: Boolean, required: true, default: false })
  revisionRequested: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Revision', required: true })
  revisionId: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  actionDate: Date;
}

export const WorkflowActionHistorySchema = SchemaFactory.createForClass(WorkflowActionHistory);
