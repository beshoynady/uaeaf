import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { LICENSE_LEVELS } from '../../../common/constants/license-levels.js';
import type { LicenseLevel } from '../../../common/constants/license-levels.js';
import { OFFICIAL_ROLE_TYPES } from '../../../common/constants/official-role-types.js';
import type { OfficialRoleType } from '../../../common/constants/official-role-types.js';
import { RESIDENCY_TYPES } from '../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../common/constants/residency-types.js';

/** Request body for POST /officials. No `slug` (removed 2026-09-03): the
 *  public routing identifier now lives solely on `officialProfiles.slug`. */
export class CreateOfficialDto {
  @ApiProperty({ description: 'Bilingual full name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  fullName: LocalizedTextDto;

  @ApiProperty({ enum: OFFICIAL_ROLE_TYPES })
  @IsIn(OFFICIAL_ROLE_TYPES)
  roleType: OfficialRoleType;

  @ApiProperty({ enum: LICENSE_LEVELS })
  @IsIn(LICENSE_LEVELS)
  licenseLevel: LicenseLevel;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  disciplineIds?: string[];

  @ApiProperty()
  @IsMongoId()
  nationalityId: string;

  @ApiProperty({ enum: RESIDENCY_TYPES })
  @IsIn(RESIDENCY_TYPES)
  residencyType: ResidencyType;

  @ApiProperty({
    description: 'Home national federation display name — populated only when residencyType=Guest.',
    type: LocalizedTextDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  federationName?: LocalizedTextDto;
}
