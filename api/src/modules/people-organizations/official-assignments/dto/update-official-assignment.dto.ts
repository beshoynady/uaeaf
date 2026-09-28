import { PartialType } from '@nestjs/swagger';
import { CreateOfficialAssignmentDto } from './create-official-assignment.dto.js';

/** Request body for PATCH /official-assignments/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateOfficialAssignmentDto extends PartialType(CreateOfficialAssignmentDto, { skipNullProperties: false }) {}
