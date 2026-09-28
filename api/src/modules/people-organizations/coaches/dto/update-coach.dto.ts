import { PartialType } from '@nestjs/swagger';
import { CreateCoachDto } from './create-coach.dto.js';

/** Request body for PATCH /coaches/:id. Every field optional; omitting one
 *  leaves it unchanged. */
export class UpdateCoachDto extends PartialType(CreateCoachDto, { skipNullProperties: false }) {}
