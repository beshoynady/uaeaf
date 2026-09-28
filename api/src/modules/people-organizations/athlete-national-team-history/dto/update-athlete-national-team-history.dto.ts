import { PartialType } from '@nestjs/swagger';
import { CreateAthleteNationalTeamHistoryDto } from './create-athlete-national-team-history.dto.js';

/** Request body for PATCH /athlete-national-team-history/:id. Every field
 *  optional; omitting one leaves it unchanged. */
export class UpdateAthleteNationalTeamHistoryDto extends PartialType(CreateAthleteNationalTeamHistoryDto, { skipNullProperties: false }) {}
