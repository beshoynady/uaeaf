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
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  PAGE_SECTION_SELECTION_MODES,
  PAGE_SECTION_VISIBILITIES,
} from '../schemas/page-sections.schema.js';
import type { PageSectionSelectionMode, PageSectionVisibility } from '../schemas/page-sections.schema.js';

/**
 * Request body for PATCH /page-sections/:id.
 *
 * `pageId` and `sectionType` are absent on purpose. A section's page and its
 * kind are what it *is*; changing either is deleting one section and creating
 * another, and doing that through an edit would leave the old page's ordering
 * silently short one entry.
 *
 * The nullable fields distinguish "leave it" (`undefined`) from "clear it"
 * (`null`), and the service reads key presence rather than truthiness so that
 * clearing a heading is expressible at all.
 */
export class UpdatePageSectionDto {
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  sectionTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  sectionSubtitle?: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  itemLimit?: number | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaText?: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  ctaUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  visibleFrom?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  visibleUntil?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, enum: PAGE_SECTION_VISIBILITIES })
  @IsOptional()
  @IsIn(PAGE_SECTION_VISIBILITIES)
  visibility?: PageSectionVisibility;

  @ApiProperty({ required: false, enum: PAGE_SECTION_SELECTION_MODES })
  @IsOptional()
  @IsIn(PAGE_SECTION_SELECTION_MODES)
  selectionMode?: PageSectionSelectionMode;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  items?: string[];

  @ApiProperty({ required: false, nullable: true, type: Object, description: 'Free-form section-specific settings. For a HERO section: `nextEvent` { isVisible, label{ar,en} (≤52), name{ar,en} (≤52), venue{ar,en} (≤35), startsAt, endsAt (ISO instants, endsAt ≥ startsAt) } and `playback` { autoplay, intervalMs: 5000 | 7000 | 9000 }. Refused with `incompleteNextEvent` (a visible bar with gaps, listed in `missing`), `nextEventEndsBeforeStart`, `heroTextTooLong` or `invalidPlayback`.' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown> | null;

  @ApiProperty({ required: false, nullable: true, type: Object })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown> | null;
}
