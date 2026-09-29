import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SEASON_PHASE_TYPES } from '../schemas/season.schema.js';
import type { SeasonPhaseType } from '../schemas/season.schema.js';

/** One entry of `phases[]` on the create/update season body. */
export class SeasonPhaseDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ enum: SEASON_PHASE_TYPES })
  @IsIn(SEASON_PHASE_TYPES)
  type: SeasonPhaseType;

  @ApiProperty()
  @IsDateString()
  from: string;

  @ApiProperty()
  @IsDateString()
  to: string;
}
