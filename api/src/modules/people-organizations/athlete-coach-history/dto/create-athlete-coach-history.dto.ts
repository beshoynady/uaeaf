import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/** Request body for POST /athlete-coach-history. */
export class CreateAthleteCoachHistoryDto {
  @ApiProperty()
  @IsMongoId()
  athleteId: string;

  @ApiProperty()
  @IsMongoId()
  coachId: string;

  @ApiProperty({ description: 'Set when the coach is discipline-specific.', required: false })
  @IsOptional()
  @IsMongoId()
  disciplineId?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Omit to mean this is the current coach.', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
