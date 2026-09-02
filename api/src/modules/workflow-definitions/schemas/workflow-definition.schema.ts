import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';

export type WorkflowDefinitionDocument = HydratedDocument<WorkflowDefinition>;

/**
 * Implements: workflowDefinitions collection, Domain 7 (FigJam node
 * `100:7436`, re-read fresh 2026-09-02 for Week 2). No version field and no
 * enforced uniqueness on `entityType` exist on the live board — multiple
 * definitions may share an `entityType`; selection of which one to use for
 * a given entity+operation happens one layer up, via
 * `workflowPolicies.workflowDefinitionId` (see WorkflowPoliciesService).
 */
@Schema({ collection: 'workflowDefinitions' })
export class WorkflowDefinition extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: String, enum: WORKFLOW_ENTITY_TYPES, required: true })
  entityType: WorkflowEntityType;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const WorkflowDefinitionSchema = SchemaFactory.createForClass(WorkflowDefinition);
