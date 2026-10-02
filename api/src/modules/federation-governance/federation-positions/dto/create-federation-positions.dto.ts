import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { POSITION_BODIES } from '../schemas/federation-positions.schema.js';
import type { PositionBody } from '../schemas/federation-positions.schema.js';

/** Request body for POST /federation-positions. */
export class CreateFederationPositionDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ enum: POSITION_BODIES })
  @IsIn(POSITION_BODIES)
  body: PositionBody;

  @ApiProperty({ description: 'Level in the org chart, 1 being the highest.' })
  @IsInt()
  rank: number;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'How many people may hold the post at once. Omitted or null is unlimited.',
  })
  @IsOptional()
  @IsInt()
  maxHolders?: number | null;

  @ApiProperty({ required: false, description: 'Defaults to true when omitted.' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
