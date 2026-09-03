import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { HERO_SLIDE_MEDIA_TYPES } from '../schemas/hero-slides.schema.js';
import type { HeroSlideMediaType } from '../schemas/hero-slides.schema.js';

/** Request body for POST /hero-slides. */
export class CreateHeroSlideDto {
  @ApiProperty({ description: 'The HERO pageSections instance this slide belongs to.' })
  @IsMongoId()
  pageSectionId: string;

  @ApiProperty({ enum: HERO_SLIDE_MEDIA_TYPES })
  @IsIn(HERO_SLIDE_MEDIA_TYPES)
  mediaType: HeroSlideMediaType;

  @ApiProperty({ required: false, description: 'Required when mediaType=IMAGE.' })
  @IsOptional()
  @IsMongoId()
  imageAssetId?: string;

  @ApiProperty({ required: false, description: 'Required when mediaType=VIDEO.' })
  @IsOptional()
  @IsMongoId()
  videoId?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subtitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaText: LocalizedTextDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  ctaUrl: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledTo?: string;
}
