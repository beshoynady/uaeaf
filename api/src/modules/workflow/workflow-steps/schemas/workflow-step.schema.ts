import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';

export type WorkflowStepDocument = HydratedDocument<WorkflowStep>;

export const WORKFLOW_STEP_TYPES = ['Sequential', 'Parallel'] as const;
export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

/** Implements: workflowSteps collection, Domain 7 (FigJam node `100:7468`,
 *  re-read fresh 2026-09-02). `stepType` + `requiredApprovals` cover all
 *  three approval shapes without a fourth enum: Sequential = ordered
 *  chain; Parallel + requiredApprovals=1 = any one approver; Parallel +
 *  requiredApprovals=N = N of M. `assigneeType` is fixed to `'User'` per
 *  the board's own note — approval routing is always to named individuals,
 *  never a role or committee as a group. */
@Schema({ collection: 'workflowSteps', timestamps: true })
export class WorkflowStep extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'WorkflowDefinition', required: true })
  workflowDefinitionId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  sequenceOrder: number;

  @Prop({ type: String, enum: WORKFLOW_STEP_TYPES, required: true })
  stepType: WorkflowStepType;

  @Prop({ type: String, enum: ['User'], default: 'User' })
  assigneeType: 'User';

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assigneeIds: Types.ObjectId[];

  @Prop({ type: Number, required: true })
  requiredApprovals: number;
}

export const WorkflowStepSchema = SchemaFactory.createForClass(WorkflowStep);
// A position in the chain names one step. Two steps sharing it is a state
// where `findNext` — which asks for a strictly greater `sequenceOrder` —
// silently skips whichever it did not return first, so that step's assignees
// never review anything (audit finding H5). Partial on `archivedAt: null` so
// an archived step does not permanently block a corrected replacement: the
// `pages.slug` precedent.
//
// Mongoose does not drop a superseded index on its own, and there was no index
// on this collection at all before, so nothing has to be dropped first.
WorkflowStepSchema.index(
  { workflowDefinitionId: 1, sequenceOrder: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
