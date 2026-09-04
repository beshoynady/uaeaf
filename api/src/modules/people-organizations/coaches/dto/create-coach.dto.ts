import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LICENSE_LEVELS } from '../../../../common/constants/license-levels.js';
import type { LicenseLevel } from '../../../../common/constants/license-levels.js';
import { COACH_GENDERS, COACH_STATUSES } from '../schemas/coach.schema.js';
import type { CoachGender, CoachStatus } from '../schemas/coach.schema.js';

/** Request body for POST /coaches. */
export class CreateCoachDto {
  @ApiProperty({ description: 'Bilingual full name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  fullName: LocalizedTextDto;

  @ApiProperty({ description: 'Unique slug for the detail page.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  photoId?: string;

  @ApiProperty({ enum: LICENSE_LEVELS })
  @IsIn(LICENSE_LEVELS)
  licenseLevel: LicenseLevel;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  registrationNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  clubId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  disciplineIds?: string[];

  @ApiProperty()
  @IsMongoId()
  nationalityId: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  bio?: LocalizedTextDto;

  @ApiProperty({ enum: COACH_GENDERS })
  @IsIn(COACH_GENDERS)
  gender: CoachGender;

  @ApiProperty({ enum: COACH_STATUSES })
  @IsIn(COACH_STATUSES)
  status: CoachStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
