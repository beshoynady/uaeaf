import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentBlockDto, IconedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

/** Request shape for one `impactMetrics[]` KPI card. */
export class ImpactMetricDto {
  @ApiProperty({ description: 'Plain string, e.g. "2030" or "+45%".' })
  @IsString()
  @MinLength(1)
  value: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}

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

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ type: [IconedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconedContentBlockDto)
  foundationPillars?: IconedContentBlockDto[];

  @ApiProperty({ type: [ContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  strategicAxes?: ContentBlockDto[];

  @ApiProperty({ type: [ContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  objectives?: ContentBlockDto[];

  @ApiProperty({ type: [ImpactMetricDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImpactMetricDto)
  impactMetrics?: ImpactMetricDto[];

  @ApiProperty({ required: false, description: 'ref → documents. Attached file, not independently approved.' })
  @IsOptional()
  @IsMongoId()
  documentId?: string;

  @ApiProperty({ required: false, description: 'e.g. "1.0" — accompanies documentId.' })
  @IsOptional()
  @IsString()
  documentVersion?: string;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
