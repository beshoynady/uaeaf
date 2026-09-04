import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/** Request body for POST /athlete-national-team-history. */
export class CreateAthleteNationalTeamHistoryDto {
  @ApiProperty()
  @IsMongoId()
  athleteId: string;

  @ApiProperty({ description: 'Which national-team tier (Youth, Junior, Senior, ...).' })
  @IsMongoId()
  ageCategoryId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Omit to mean the athlete is currently on this roster.', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
