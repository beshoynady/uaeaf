import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { RESIDENCY_TYPES } from '../../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../../common/constants/residency-types.js';
import { ATHLETE_GENDERS } from '../schemas/athlete.schema.js';
import type { AthleteGender } from '../schemas/athlete.schema.js';

/** Public-safe `Athlete` shape — deliberately excludes `dateOfBirth`
 *  (`[SENSITIVE-MINOR]`, ADR-0028 / Federal Law 26/2025). A distinct
 *  response class, not a conditionally-serialized subset of the full
 *  entity, so the exclusion is structural rather than relying on a single
 *  serializer to remember to hide the field — see
 *  `AthletesService.toPublicResponse()` (2026-09-03 correction). */
export class AthletePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) name: LocalizedTextDto;
  @ApiProperty() nationalityId: string;
  @ApiProperty({ type: [String] }) disciplineIds: string[];
  @ApiProperty({ enum: ATHLETE_GENDERS }) gender: AthleteGender;
  @ApiProperty({ enum: RESIDENCY_TYPES }) residencyType: ResidencyType;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  federationName: LocalizedTextDto | null;
}
