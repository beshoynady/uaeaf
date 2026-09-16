import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { MAX_PLAN_ROW_ITEMS } from '../../../../common/constants/plan-row-limit.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { PlanListItemDto, PlanMetricDto, PlanPhaseDto, PlanStepDto } from './plan-list-items.dto.js';

/**
 * Request body for `PATCH /strategic-plans-page/:id` — the editable surface
 * of the page, and deliberately not `PartialType(Create…)`.
 *
 * Three fields the create body carries are absent here on purpose:
 *
 * - `federationId` is the row's identity: the page states one federation's
 *   plan, and re-pointing it would attribute that plan to another.
 * - `publicationState` is denormalized from `publications` (ADR-0020), a
 *   consequence of publishing and never an instruction from a client.
 * - `revisionId` is written by the revision service, not by an editor.
 *
 * Every field is optional and applied only when its key is present, so a
 * partial save touches nothing it did not name. `null` clears a nullable
 * field; omitting the key leaves it alone. A list sent here replaces the
 * stored list; an item keeps its id when it carries one the stored list
 * holds, and is otherwise treated as new.
 */
export class UpdateStrategicPlansPageDto {
  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  heroImageId?: string | null;

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

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introHeading?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introText?: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph beside the overview: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  introImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  phasesTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: [PlanPhaseDto], required: false, maxItems: MAX_PLAN_ROW_ITEMS, description: `Stands in one row: at most ${MAX_PLAN_ROW_ITEMS} items, hidden ones counted (refused with \`listTooLong\`).` })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanPhaseDto)
  phases?: PlanPhaseDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pillarsTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pillarsText?: LocalizedTextDto | null;

  @ApiProperty({ type: [PlanListItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanListItemDto)
  pillars?: PlanListItemDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  objectivesTitle?: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph beside the objectives: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  objectivesImageId?: string | null;

  @ApiProperty({ type: [PlanListItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanListItemDto)
  objectives?: PlanListItemDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  metricsTitle?: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the metrics band: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  metricsImageId?: string | null;

  @ApiProperty({ type: [PlanMetricDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanMetricDto)
  metrics?: PlanMetricDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  executionTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  executionText?: LocalizedTextDto | null;

  @ApiProperty({ type: [PlanStepDto], required: false, maxItems: MAX_PLAN_ROW_ITEMS, description: `Stands in one row: at most ${MAX_PLAN_ROW_ITEMS} items, hidden ones counted (refused with \`listTooLong\`).` })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanStepDto)
  executionSteps?: PlanStepDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaText?: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the closing call: ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  ctaImageId?: string | null;

  @ApiProperty({ type: PageSeoDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
