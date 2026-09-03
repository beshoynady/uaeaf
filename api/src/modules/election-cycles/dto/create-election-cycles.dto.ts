import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { ELECTION_CYCLE_STATUSES } from '../schemas/election-cycles.schema.js';
import type { ElectionCycleStatus } from '../schemas/election-cycles.schema.js';

/** Request body for POST /election-cycles. */
export class CreateElectionCycleDto {
  @ApiProperty()
  @IsMongoId()
  federationId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Sequential cycle number (1, 2, 3...).' })
  @IsInt()
  cycleNumber: number;

  @ApiProperty({ type: LocalizedTextDto, description: 'e.g. "الدورة 2024-2028".' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  cycleName: LocalizedTextDto;

  @ApiProperty({ enum: ELECTION_CYCLE_STATUSES })
  @IsIn(ELECTION_CYCLE_STATUSES)
  status: ElectionCycleStatus;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  notes?: LocalizedTextDto;
}
