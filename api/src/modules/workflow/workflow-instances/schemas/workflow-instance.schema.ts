import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../../common/constants/workflow-entity-types.js';

export type WorkflowInstanceDocument = HydratedDocument<WorkflowInstance>;

export const WORKFLOW_INSTANCE_STATUSES = ['InProgress', 'Approved', 'Rejected', 'Returned'] as const;
export type WorkflowInstanceStatus = (typeof WORKFLOW_INSTANCE_STATUSES)[number];

/**
 * Implements: workflowInstances collection, Domain 7 (FigJam node
 * `100:7512`, re-read fresh 2026-09-02). `entityId` is a polymorphic
 * reference across the 13 workflow-participation entity types — plain
 * `ObjectId`, no `ref`, matching every other poly field on the board.
 *
 * `status` is a closed 4-value enum on the live board — `InProgress |
 * Approved | Rejected | Returned` — with **no `Cancelled` value**. See
 * `WorkflowInstancesService` for how this module represents "cancelled"
 * (via the universal `archivedAt` soft-delete field, not a status value)
 * and the flagged ambiguity this involved.
 *
 * `revisionId` (added to the live board 2026-09-01) is the "CRITICAL LINK"
 * the board's own note describes: without it, nothing proves which exact
 * content version an approver reviewed.
 */
@Schema({ collection: 'workflowInstances' })
export class WorkflowInstance extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'WorkflowDefinition', required: true })
  workflowDefinitionId: Types.ObjectId;

  @Prop({ type: String, enum: WORKFLOW_ENTITY_TYPES, required: true })
  entityType: WorkflowEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Revision', default: null })
  revisionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WorkflowStep', default: null })
  currentStepId: Types.ObjectId | null;

  @Prop({ type: String, enum: WORKFLOW_INSTANCE_STATUSES, required: true, default: 'InProgress' })
  status: WorkflowInstanceStatus;

  @Prop({ type: Date, required: true, default: Date.now })
  startedAt: Date;
}

export const WorkflowInstanceSchema = SchemaFactory.createForClass(WorkflowInstance);
WorkflowInstanceSchema.index({ entityType: 1, entityId: 1 });
