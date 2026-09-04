import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsMongoId, IsOptional } from 'class-validator';
import { WORKFLOW_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../../common/constants/workflow-entity-types.js';
import { WORKFLOW_POLICY_OPERATIONS } from '../schemas/workflow-policy.schema.js';
import type { WorkflowPolicyOperation } from '../schemas/workflow-policy.schema.js';

/** Request body for POST /workflow-policies. */
export class CreateWorkflowPolicyDto {
  @ApiProperty({ description: 'The governed entity type.', enum: WORKFLOW_ENTITY_TYPES })
  @IsIn(WORKFLOW_ENTITY_TYPES)
  entityType: WorkflowEntityType;

  @ApiProperty({ description: 'The governed operation.', enum: WORKFLOW_POLICY_OPERATIONS })
  @IsIn(WORKFLOW_POLICY_OPERATIONS)
  operation: WorkflowPolicyOperation;

  @ApiProperty({ description: 'Whether this (entityType, operation) pair requires approval at all.' })
  @IsBoolean()
  workflowRequired: boolean;

  @ApiProperty({
    description: 'Required when workflowRequired=true; the definition to route through.',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  workflowDefinitionId?: string;

  @ApiProperty({ description: 'Whether HardDelete is permitted for this entityType at all.', default: false })
  @IsBoolean()
  allowHardDelete: boolean;
}
