import { PartialType } from '@nestjs/swagger';
import { CreateAthleteDto } from './create-athlete.dto.js';

/** Request body for PATCH /athletes/:id. Every field optional; omitting one
 *  leaves it unchanged. */
export class UpdateAthleteDto extends PartialType(CreateAthleteDto, { skipNullProperties: false }) {}
