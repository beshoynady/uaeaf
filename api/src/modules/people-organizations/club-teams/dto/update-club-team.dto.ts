import { PartialType } from '@nestjs/swagger';
import { CreateClubTeamDto } from './create-club-team.dto.js';

/** Request body for PATCH /club-teams/:id. Every field optional; omitting
 *  one leaves it unchanged. */
export class UpdateClubTeamDto extends PartialType(CreateClubTeamDto, { skipNullProperties: false }) {}
