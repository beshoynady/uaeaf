import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { MAX_PLAN_ROW_ITEMS } from '../../../../common/constants/plan-row-limit.js';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import { PlanListItemDto, PlanMetricDto, PlanPhaseDto, PlanStepDto } from './plan-list-items.dto.js';

/** Request body for POST /strategic-plans-page. */
export class CreateStrategicPlansPageDto extends HeroPageDto {
  @ApiProperty()
  @IsMongoId()
  federationId: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introHeading: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introText: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph beside the overview: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  introImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  phasesTitle?: LocalizedTextDto;

  @ApiProperty({ type: [PlanPhaseDto], required: false, maxItems: MAX_PLAN_ROW_ITEMS, description: `Stands in one row: at most ${MAX_PLAN_ROW_ITEMS} items, hidden ones counted (refused with \`listTooLong\`).` })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanPhaseDto)
  phases?: PlanPhaseDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pillarsTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pillarsText?: LocalizedTextDto;

  @ApiProperty({ type: [PlanListItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanListItemDto)
  pillars?: PlanListItemDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  objectivesTitle: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph beside the objectives: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  objectivesImageId?: string | null;

  @ApiProperty({ type: [PlanListItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanListItemDto)
  objectives?: PlanListItemDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  metricsTitle: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the metrics band: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  metricsImageId?: string | null;

  @ApiProperty({ type: [PlanMetricDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanMetricDto)
  metrics?: PlanMetricDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  executionTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  executionText?: LocalizedTextDto;

  @ApiProperty({ type: [PlanStepDto], required: false, maxItems: MAX_PLAN_ROW_ITEMS, description: `Stands in one row: at most ${MAX_PLAN_ROW_ITEMS} items, hidden ones counted (refused with \`listTooLong\`).` })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanStepDto)
  executionSteps?: PlanStepDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaText?: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the closing call: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  ctaImageId?: string | null;

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
