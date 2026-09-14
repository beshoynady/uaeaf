import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentBlockDto, IconKeyedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';

/**
 * Request body for `PATCH /vision-mission-page/:id` — the editable surface of
 * the page, and deliberately not `PartialType(Create…)`.
 *
 * Three fields the create body carries are absent here on purpose:
 *
 * - `federationId` is the row's identity: the page states one federation's
 *   vision, and re-pointing it would attribute that statement to another.
 * - `publicationState` is denormalized from `publications` (ADR-0020), a
 *   consequence of publishing and never an instruction from a client.
 * - `revisionId` is written by the revision service, not by an editor.
 *
 * Every field is optional and applied only when its key is present, so a
 * partial save touches nothing it did not name. `null` clears a nullable
 * field; omitting the key leaves it alone.
 */
export class UpdateVisionMissionPageDto {
  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  heroImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the vision statement: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  visionImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the mission statement: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  missionImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the values band: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  valuesImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the call to the strategic plan: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  ctaImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroSubtitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  visionTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  visionText?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  missionTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  missionText?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  goalsTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: [ContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  strategicGoals?: ContentBlockDto[];

  @ApiProperty({ type: [IconKeyedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconKeyedContentBlockDto)
  coreValues?: IconKeyedContentBlockDto[];

  @ApiProperty({ type: PageSeoDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
