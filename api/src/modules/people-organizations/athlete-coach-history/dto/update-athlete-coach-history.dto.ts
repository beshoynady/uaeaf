import { PartialType } from '@nestjs/swagger';
import { CreateAthleteCoachHistoryDto } from './create-athlete-coach-history.dto.js';

/** Request body for PATCH /athlete-coach-history/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateAthleteCoachHistoryDto extends PartialType(CreateAthleteCoachHistoryDto, { skipNullProperties: false }) {}
