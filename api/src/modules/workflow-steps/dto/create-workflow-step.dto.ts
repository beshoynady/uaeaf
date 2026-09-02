import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsMongoId, Min } from 'class-validator';
import { WORKFLOW_STEP_TYPES } from '../schemas/workflow-step.schema.js';
import type { WorkflowStepType } from '../schemas/workflow-step.schema.js';

/** Request body for POST /workflow-steps. */
export class CreateWorkflowStepDto {
  @ApiProperty({ description: 'Owning workflow definition id.' })
  @IsMongoId()
  workflowDefinitionId: string;

  @ApiProperty({ description: 'Ordering within the definition, ascending.' })
  @IsInt()
  @Min(0)
  sequenceOrder: number;

  @ApiProperty({ description: 'Sequential (ordered chain) or Parallel (multi-approver).', enum: WORKFLOW_STEP_TYPES })
  @IsIn(WORKFLOW_STEP_TYPES)
  stepType: WorkflowStepType;

  @ApiProperty({ description: 'Named user ids assigned to this step.', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  assigneeIds: string[];

  @ApiProperty({
    description:
      '1 for Sequential or "any one approver"; assigneeIds.length for "all"; any N for "N of M".',
  })
  @IsInt()
  @Min(1)
  requiredApprovals: number;
}
