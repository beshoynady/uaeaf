import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { RESIDENCY_TYPES } from '../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../common/constants/residency-types.js';
import { ATHLETE_GENDERS } from '../schemas/athlete.schema.js';
import type { AthleteGender } from '../schemas/athlete.schema.js';

/** Request body for POST /athletes. No `slug` (removed 2026-09-03): the
 *  public routing identifier now lives solely on `athleteProfiles.slug`. */
export class CreateAthleteDto {
  @ApiProperty({ description: 'Bilingual athlete name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty()
  @IsMongoId()
  nationalityId: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  disciplineIds?: string[];

  @ApiProperty({ enum: ATHLETE_GENDERS })
  @IsIn(ATHLETE_GENDERS)
  gender: AthleteGender;

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
