import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowDefinitionDto } from './create-workflow-definition.dto.js';

/** Request body for PATCH /workflow-definitions/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateWorkflowDefinitionDto extends PartialType(CreateWorkflowDefinitionDto, { skipNullProperties: false }) {}
