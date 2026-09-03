import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { CLUB_TYPES, CLUB_STATUSES } from '../schemas/club.schema.js';
import type { ClubType, ClubStatus } from '../schemas/club.schema.js';
import { SocialLinkDto } from './social-link.dto.js';

/** Request body for POST /clubs. */
export class CreateClubDto {
  @ApiProperty({ description: 'Bilingual club name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Unique slug for the club detail page.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  logoId?: string;

  @ApiProperty()
  @IsDateString()
  foundingDate: string;

  @ApiProperty({ description: 'The emirate this club is registered in.' })
  @IsMongoId()
  emirateId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  registrationNumber: string;

  @ApiProperty({ enum: CLUB_TYPES })
  @IsIn(CLUB_TYPES)
  clubType: ClubType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  coverImage?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ type: [SocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  venueId?: string;

  @ApiProperty({ enum: CLUB_STATUSES })
  @IsIn(CLUB_STATUSES)
  status: ClubStatus;

  @ApiProperty({ description: 'References `videos`, not `mediaAssets`.', required: false })
  @IsOptional()
  @IsMongoId()
  introVideoId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
