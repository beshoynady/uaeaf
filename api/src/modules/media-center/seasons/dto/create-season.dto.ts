import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { SEASON_PUBLICATION_STATES } from '../schemas/season.schema.js';
import type { SeasonPublicationState } from '../schemas/season.schema.js';
import { SeasonPhaseDto } from './season-phase.dto.js';
import { SeasonKeyDateDto } from './season-key-date.dto.js';

/** `publicationState` values creatable directly via POST /seasons —
 *  `'Published'` is reachable only through `PATCH /seasons/:id/publish`,
 *  which is gated by a dedicated `Publish` permission. */
export const CREATABLE_SEASON_PUBLICATION_STATES = SEASON_PUBLICATION_STATES.filter(
  (state) => state !== 'Published',
);

/** Request body for POST /seasons. Excludes `publishedAt`/`publishedBy`
 *  (server-set only, via `SeasonsService.publish()`) and `isCurrent`
 *  (settable only via `PATCH /seasons/:id/set-current`). */
export class CreateSeasonDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  shortName: string;

  @ApiProperty({ description: 'Unique slug for the public season page, e.g. "2026-2027".' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  tagline?: LocalizedTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  logoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  bannerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  shareImageId?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  about: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  closingSummary?: LocalizedTextDto;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ type: [SeasonPhaseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeasonPhaseDto)
  phases?: SeasonPhaseDto[];

  @ApiPropertyOptional({ type: [SeasonKeyDateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeasonKeyDateDto)
  keyDates?: SeasonKeyDateDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  calendarDocumentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  documentIds?: string[];

  @ApiProperty({ enum: CREATABLE_SEASON_PUBLICATION_STATES })
  @IsIn(CREATABLE_SEASON_PUBLICATION_STATES)
  publicationState: SeasonPublicationState;

  @ApiPropertyOptional({ description: 'Hidden unless true.' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ type: PageSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}
