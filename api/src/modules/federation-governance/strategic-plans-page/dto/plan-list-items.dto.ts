import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PLAN_PHASE_ICON_KEYS } from '../../../../common/constants/plan-phase-icon-keys.js';
import type { PlanPhaseIconKey } from '../../../../common/constants/plan-phase-icon-keys.js';

/**
 * Request shapes for the strategic plan's list items.
 *
 * `_id` is optional on every item: one that carries an id the stored list
 * already holds keeps it, any other item is given a fresh one by the
 * service. The dashboard therefore never has to know which items are new.
 * `isVisible` left out means visible.
 *
 * `@IsDefined()` is not redundant beside `@ValidateNested()`: on an absent
 * value `ValidateNested` passes silently, and an item with no title would
 * only fail at the schema, after the image checks ran.
 */
export class PlanListItemDto {
  @ApiProperty({ required: false, description: 'The item\'s id when it already exists; omitted for a new item.' })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

/** A phase card: `iconKey` closed to the four plan glyphs. */
export class PlanPhaseDto extends PlanListItemDto {
  @ApiProperty({ enum: PLAN_PHASE_ICON_KEYS, description: 'One of the four approved phase icon keys.' })
  @IsIn(PLAN_PHASE_ICON_KEYS)
  iconKey: PlanPhaseIconKey;
}

/** A KPI card. */
export class PlanMetricDto {
  @ApiProperty({ required: false, description: 'The item\'s id when it already exists; omitted for a new item.' })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty({ description: 'Free text, e.g. "2030", "15" or "+30%".' })
  @IsString()
  @MinLength(1)
  value: string;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

/** One step of the execution chain; the description is optional. */
export class PlanStepDto {
  @ApiProperty({ required: false, description: 'The item\'s id when it already exists; omitted for a new item.' })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto | null;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
