import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/** Request body for POST /coach-club-history. */
export class CreateCoachClubHistoryDto {
  @ApiProperty()
  @IsMongoId()
  coachId: string;

  @ApiProperty()
  @IsMongoId()
  clubId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description:
      'When creating a new current row (endDate omitted) and the coach already has a current club, ' +
      'the date their previous relationship is closed out on. Defaults to now if omitted.',
  })
  @IsOptional()
  @IsDateString()
  transferDate?: string;
}
