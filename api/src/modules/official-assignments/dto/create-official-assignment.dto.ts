import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { OFFICIAL_ASSIGNMENT_TARGET_TYPES } from '../schemas/official-assignment.schema.js';
import type { OfficialAssignmentTargetType } from '../schemas/official-assignment.schema.js';

/** Request body for POST /official-assignments. */
export class CreateOfficialAssignmentDto {
  @ApiProperty()
  @IsMongoId()
  officialId: string;

  @ApiProperty({ enum: OFFICIAL_ASSIGNMENT_TARGET_TYPES })
  @IsIn(OFFICIAL_ASSIGNMENT_TARGET_TYPES)
  targetType: OfficialAssignmentTargetType;

  @ApiProperty({ description: 'A championship or championshipEvent id, matching targetType.' })
  @IsMongoId()
  targetId: string;
}
