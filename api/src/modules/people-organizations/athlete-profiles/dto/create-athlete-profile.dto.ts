import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../clubs/dto/social-link.dto.js';
import { ATHLETE_PROFILE_STATUSES } from '../schemas/athlete-profile.schema.js';
import type { AthleteProfileStatus } from '../schemas/athlete-profile.schema.js';
import { RestrictedProfileInfoDto } from './restricted-profile-info.dto.js';

/** Request body for POST /athlete-profiles. */
export class CreateAthleteProfileDto {
  @ApiProperty({ description: 'Must reference an athlete with residencyType=Local.' })
  @IsMongoId()
  athleteId: string;

  @ApiProperty({ description: "Unique slug for the athlete's public profile page." })
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

  @ApiProperty({ type: RestrictedProfileInfoDto })
  @ValidateNested()
  @Type(() => RestrictedProfileInfoDto)
  restricted: RestrictedProfileInfoDto;

  @ApiProperty({ enum: ATHLETE_PROFILE_STATUSES })
  @IsIn(ATHLETE_PROFILE_STATUSES)
  status: AthleteProfileStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  photoId?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  bio?: LocalizedTextDto;

  @ApiProperty({ type: [SocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
