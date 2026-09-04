import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { OFFICIAL_PROFILE_GENDERS, OFFICIAL_PROFILE_STATUSES } from '../schemas/official-profile.schema.js';
import type { OfficialProfileGender, OfficialProfileStatus } from '../schemas/official-profile.schema.js';

/** Request body for POST /official-profiles. */
export class CreateOfficialProfileDto {
  @ApiProperty({ description: 'Must reference an official with residencyType=Local.' })
  @IsMongoId()
  officialId: string;

  @ApiProperty({ description: "Unique slug for the official's public profile page." })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  clubId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  registrationNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  photoId?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  bio?: LocalizedTextDto;

  @ApiProperty({ enum: OFFICIAL_PROFILE_GENDERS })
  @IsIn(OFFICIAL_PROFILE_GENDERS)
  gender: OfficialProfileGender;

  @ApiProperty({ enum: OFFICIAL_PROFILE_STATUSES })
  @IsIn(OFFICIAL_PROFILE_STATUSES)
  status: OfficialProfileStatus;
}
