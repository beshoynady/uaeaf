import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { FocalPointDto, HeroCtaDto, HeroTextDto } from './hero-slide-parts.dto.js';
import { HERO_SLIDE_MEDIA_TYPES, HERO_SLIDE_LIMIT, LTR_IMAGE_MODES } from '../schemas/hero-slides.schema.js';
import type { HeroSlideMediaType, LtrImageMode } from '../schemas/hero-slides.schema.js';

/** Request body for POST /hero-slides. */
export class CreateHeroSlideDto {
  @ApiProperty({
    description: `The HERO pageSections instance this slide belongs to. A section holds at most ${HERO_SLIDE_LIMIT.max} slides (refused with \`listTooLong\`).`,
  })
  @IsMongoId()
  pageSectionId: string;

  @ApiProperty({ enum: HERO_SLIDE_MEDIA_TYPES })
  @IsIn(HERO_SLIDE_MEDIA_TYPES)
  mediaType: HeroSlideMediaType;

  @ApiProperty({ required: false, description: 'Required when mediaType=IMAGE and the slide is active (refused with `incompleteSlide`).' })
  @IsOptional()
  @IsMongoId()
  imageAssetId?: string;

  @ApiProperty({
    type: FocalPointDto,
    required: false,
    description: 'Where the landscape picture must keep looking under the hero crop. Defaults to the centre.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  desktopFocalPoint?: FocalPointDto;

  @ApiProperty({
    required: false,
    description: 'When true, `mobileImageAssetId` is required (refused with `missingRequiredField`).',
  })
  @IsOptional()
  @IsBoolean()
  useMobileImage?: boolean;

  @ApiProperty({ required: false, description: 'The portrait crop phones show when `useMobileImage` is true.' })
  @IsOptional()
  @IsMongoId()
  mobileImageAssetId?: string;

  @ApiProperty({ type: FocalPointDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  mobileFocalPoint?: FocalPointDto;

  @ApiProperty({
    enum: LTR_IMAGE_MODES,
    required: false,
    default: 'mirror',
    description:
      'What English readers see: `mirror` flips the landscape picture and its focal point; `same` keeps it; `separate` uses `ltrImageAssetId`. Never mirror a picture with a flag, writing or a known landmark.',
  })
  @IsOptional()
  @IsIn(LTR_IMAGE_MODES)
  ltrImageMode?: LtrImageMode;

  @ApiProperty({ required: false, description: 'Required when ltrImageMode=separate (refused with `incompleteLtrImage`).' })
  @IsOptional()
  @IsMongoId()
  ltrImageAssetId?: string;

  @ApiProperty({ type: FocalPointDto, required: false, description: 'Required when ltrImageMode=separate.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  ltrFocalPoint?: FocalPointDto;

  @ApiProperty({ required: false, description: 'Required when mediaType=VIDEO.' })
  @IsOptional()
  @IsMongoId()
  videoId?: string;

  @ApiProperty({ type: HeroTextDto, required: false, description: 'Short line above the title (at most 52 characters).' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  eyebrow?: HeroTextDto;

  @ApiProperty({ type: HeroTextDto, required: false, description: 'At most 44 characters; both halves required when active (`incompleteSlide`, `heroTextTooLong`).' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  title?: HeroTextDto;

  @ApiProperty({ type: HeroTextDto, required: false, description: 'At most 116 characters; both halves required when active.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  subtitle?: HeroTextDto;

  @ApiProperty({ type: HeroCtaDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroCtaDto)
  primaryCta?: HeroCtaDto;

  @ApiProperty({ type: HeroCtaDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroCtaDto)
  secondaryCta?: HeroCtaDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false, default: false, description: 'A new slide is hidden unless this says otherwise (owner decision 2026-09-17).' })
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
