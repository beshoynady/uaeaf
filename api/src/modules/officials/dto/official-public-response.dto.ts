import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { LICENSE_LEVELS } from '../../../common/constants/license-levels.js';
import type { LicenseLevel } from '../../../common/constants/license-levels.js';
import { RESIDENCY_TYPES } from '../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../common/constants/residency-types.js';
import { OFFICIAL_ROLE_TYPES } from '../schemas/official.schema.js';
import type { OfficialRoleType } from '../schemas/official.schema.js';

/** Public-safe `Official` shape. `Official` carries no field equivalent to
 *  `Athlete.dateOfBirth`'s sensitivity, so this is presently a full
 *  passthrough of public fields — kept as an explicit typed contract
 *  (rather than returning the raw document) for the same "never return raw
 *  from a public path" discipline applied symmetrically to the `athletes`
 *  side (2026-09-03 correction). */
export class OfficialPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) fullName: LocalizedTextDto;
  @ApiProperty({ enum: OFFICIAL_ROLE_TYPES }) roleType: OfficialRoleType;
  @ApiProperty({ enum: LICENSE_LEVELS }) licenseLevel: LicenseLevel;
  @ApiProperty({ type: [String] }) disciplineIds: string[];
  @ApiProperty() nationalityId: string;
  @ApiProperty({ enum: RESIDENCY_TYPES }) residencyType: ResidencyType;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  federationName: LocalizedTextDto | null;
}
