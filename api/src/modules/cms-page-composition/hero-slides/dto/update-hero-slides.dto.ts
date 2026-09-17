import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { FocalPointDto, HeroCtaDto, HeroTextDto } from './hero-slide-parts.dto.js';
import { HERO_SLIDE_MEDIA_TYPES, LTR_IMAGE_MODES } from '../schemas/hero-slides.schema.js';
import type { HeroSlideMediaType, LtrImageMode } from '../schemas/hero-slides.schema.js';

/**
 * Request body for PATCH /hero-slides/:id.
 *
 * Every field is optional, and omitting one leaves it alone. Two fields are
 * nullable on purpose — `mobileImageAssetId` and `eyebrow` — because clearing
 * them is a real editorial action, and `undefined` (leave it) has to stay
 * distinguishable from `null` (remove it). The service reads the key's
 * presence, not its truthiness, for exactly that reason.
 *
 * `pageSectionId` is deliberately absent: moving a slide between sections is
 * not an edit, it is a different operation with different consequences for
 * both sections' ordering.
 */
export class UpdateHeroSlideDto {
  @ApiProperty({ required: false, enum: HERO_SLIDE_MEDIA_TYPES })
  @IsOptional()
  @IsIn(HERO_SLIDE_MEDIA_TYPES)
  mediaType?: HeroSlideMediaType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  imageAssetId?: string;

  @ApiProperty({ type: FocalPointDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  desktopFocalPoint?: FocalPointDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  useMobileImage?: boolean;

  @ApiProperty({ required: false, nullable: true, description: 'null clears the portrait crop.' })
  @IsOptional()
  @IsMongoId()
  mobileImageAssetId?: string | null;

  @ApiProperty({ type: FocalPointDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  mobileFocalPoint?: FocalPointDto;

  @ApiProperty({ required: false, enum: LTR_IMAGE_MODES })
  @IsOptional()
  @IsIn(LTR_IMAGE_MODES)
  ltrImageMode?: LtrImageMode;

  @ApiProperty({ required: false, nullable: true, description: 'null clears the English picture.' })
  @IsOptional()
  @IsMongoId()
  ltrImageAssetId?: string | null;

  @ApiProperty({ type: FocalPointDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  ltrFocalPoint?: FocalPointDto | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  videoId?: string;

  @ApiProperty({ type: HeroTextDto, required: false, nullable: true, description: 'null clears the eyebrow.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  eyebrow?: HeroTextDto | null;

  @ApiProperty({ type: HeroTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  title?: HeroTextDto;

  @ApiProperty({ type: HeroTextDto, required: false })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledTo?: string | null;
}

/**
 * Request body for PATCH /hero-slides/reorder.
 *
 * The whole order arrives at once rather than as a stream of per-slide
 * `displayOrder` writes. A drag that moves one slide changes the position of
 * every slide after it, and sending those as separate requests leaves the
 * section in an order nobody chose for as long as the requests are in flight.
 *
 * The cap is the same twenty a section's editor can hold; it exists so a
 * malformed body cannot ask the server to write an unbounded number of
 * documents.
 */
export class ReorderHeroSlidesDto {
  @ApiProperty({ description: 'The HERO pageSections instance whose slides are being ordered.' })
  @IsMongoId()
  pageSectionId: string;

  @ApiProperty({ type: [String], description: 'Slide ids in their new display order, first to last.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  slideIds: string[];
}
