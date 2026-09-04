import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../../common/constants/workflow-entity-types.js';

export type WorkflowPolicyDocument = HydratedDocument<WorkflowPolicy>;

export const WORKFLOW_POLICY_OPERATIONS = ['Add', 'Edit', 'Delete', 'Unpublish', 'Archive'] as const;
export type WorkflowPolicyOperation = (typeof WORKFLOW_POLICY_OPERATIONS)[number];

/** Implements: workflowPolicies collection, Domain 7 (FigJam node
 *  `277:4402`, re-read fresh 2026-09-02 — `operation` confirmed as the
 *  5-value `Add | Edit | Delete | Unpublish | Archive` enum, `Unpublish`/
 *  `Archive` added 2026-09-01). `Publish` is deliberately not a separate
 *  operation — it is the automatic, immediate consequence of the final
 *  `workflowStep` approval on an Add/Edit operation (see
 *  `WorkflowInstancesService.approve`). `allowHardDelete` defaults false:
 *  per the board's convention, "delete" always means archive unless this
 *  is explicitly true for the entityType. */
@Schema({ collection: 'workflowPolicies' })
export class WorkflowPolicy extends BaseSchema {
  @Prop({ type: String, enum: WORKFLOW_ENTITY_TYPES, required: true })
  entityType: WorkflowEntityType;

  @Prop({ type: String, enum: WORKFLOW_POLICY_OPERATIONS, required: true })
  operation: WorkflowPolicyOperation;

  @Prop({ type: Boolean, required: true, default: false })
  workflowRequired: boolean;

  @Prop({ type: Types.ObjectId, ref: 'WorkflowDefinition', default: null })
  workflowDefinitionId: Types.ObjectId | null;

  @Prop({ type: Boolean, required: true, default: false })
  allowHardDelete: boolean;
}

export const WorkflowPolicySchema = SchemaFactory.createForClass(WorkflowPolicy);
WorkflowPolicySchema.index({ entityType: 1, operation: 1 });
