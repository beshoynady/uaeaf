import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { OFFICIAL_ASSIGNMENT_TARGET_TYPES } from '../schemas/official-assignment.schema.js';
import type { OfficialAssignmentTargetType } from '../schemas/official-assignment.schema.js';
import { OFFICIAL_ROLE_TYPES } from '../../../common/constants/official-role-types.js';
import type { OfficialRoleType } from '../../../common/constants/official-role-types.js';

/** Request body for POST /official-assignments. */
export class CreateOfficialAssignmentDto {
  @ApiProperty()
  @IsMongoId()
  officialId: string;

  @ApiProperty({
    enum: OFFICIAL_ROLE_TYPES,
    description: "The specific role for this assignment — independent of the official's general officials.roleType.",
  })
  @IsIn(OFFICIAL_ROLE_TYPES)
  role: OfficialRoleType;

  @ApiProperty({ enum: OFFICIAL_ASSIGNMENT_TARGET_TYPES })
  @IsIn(OFFICIAL_ASSIGNMENT_TARGET_TYPES)
  targetType: OfficialAssignmentTargetType;

  @ApiProperty({ description: 'A championship or championshipEvent id, matching targetType.' })
  @IsMongoId()
  targetId: string;
}
