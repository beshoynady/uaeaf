import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { WORKFLOW_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../../common/constants/workflow-entity-types.js';

/** Request body for POST /workflow-instances (submits an entity into a
 *  workflow — first action, always `Submitted`). */
export class CreateWorkflowInstanceDto {
  @ApiProperty({ description: 'The workflow definition to run.' })
  @IsMongoId()
  workflowDefinitionId: string;

  @ApiProperty({ description: 'The target entity type (closed 13-type list).', enum: WORKFLOW_ENTITY_TYPES })
  @IsIn(WORKFLOW_ENTITY_TYPES)
  entityType: WorkflowEntityType;

  @ApiProperty({ description: 'The target entity id.' })
  @IsMongoId()
  entityId: string;

  @ApiProperty({ description: 'The revision this instance targets — the exact content version under review.' })
  @IsMongoId()
  revisionId: string;
}
