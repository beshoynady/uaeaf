import { PartialType } from '@nestjs/swagger';
import { CreateDisciplineDto } from './create-discipline.dto.js';

/** Request body for PATCH /disciplines/:id. Every field optional; omitting
 *  one leaves it unchanged. */
export class UpdateDisciplineDto extends PartialType(CreateDisciplineDto, { skipNullProperties: false }) {}
