import { PartialType } from '@nestjs/swagger';
import { CreateAthleteGuardianRelationshipDto } from './create-athlete-guardian-relationship.dto.js';

/** Request body for PATCH /athlete-guardian-relationships/:id. Every field
 *  optional; omitting one leaves it unchanged. */
export class UpdateAthleteGuardianRelationshipDto extends PartialType(CreateAthleteGuardianRelationshipDto, { skipNullProperties: false }) {}
