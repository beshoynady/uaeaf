import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  PAGE_SECTION_TYPES,
  PAGE_SECTION_VISIBILITIES,
  PAGE_SECTION_SELECTION_MODES,
} from '../schemas/page-sections.schema.js';
import type {
  PageSectionType,
  PageSectionVisibility,
  PageSectionSelectionMode,
} from '../schemas/page-sections.schema.js';

/** Request body for POST /page-sections. */
export class CreatePageSectionDto {
  @ApiProperty()
  @IsMongoId()
  pageId: string;

  @ApiProperty({ enum: PAGE_SECTION_TYPES })
  @IsIn(PAGE_SECTION_TYPES)
  sectionType: PageSectionType;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  sectionTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  sectionSubtitle?: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'AUTOMATIC mode only; ignored in MANUAL.' })
  @IsOptional()
  @IsInt()
  itemLimit?: number;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaText?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  visibleFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  visibleUntil?: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ enum: PAGE_SECTION_VISIBILITIES })
  @IsIn(PAGE_SECTION_VISIBILITIES)
  visibility: PageSectionVisibility;

  @ApiProperty({ enum: PAGE_SECTION_SELECTION_MODES })
  @IsIn(PAGE_SECTION_SELECTION_MODES)
  selectionMode: PageSectionSelectionMode;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'Manually-selected item ids (MANUAL mode). Bare ObjectIds — the target collection is ' +
      'inferred from sectionType; the board defines no per-entry type discriminator.',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  items?: string[];

  @ApiProperty({ required: false, description: 'Free-form AUTOMATIC-mode query params.' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiProperty({ required: false, description: 'Free-form section-specific settings.' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}
