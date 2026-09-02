import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';

/** Request body for POST /workflow-definitions. */
export class CreateWorkflowDefinitionDto {
  @ApiProperty({ description: 'Bilingual definition name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'The entity type this definition governs (closed 13-type list).',
    enum: WORKFLOW_ENTITY_TYPES,
  })
  @IsIn(WORKFLOW_ENTITY_TYPES)
  entityType: WorkflowEntityType;

  @ApiProperty({ description: 'Whether this definition is usable.', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
