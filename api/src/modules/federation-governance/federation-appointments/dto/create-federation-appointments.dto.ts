import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsMongoId, IsOptional } from 'class-validator';
import { APPOINTMENT_STATUSES } from '../schemas/federation-appointments.schema.js';
import type { AppointmentStatus } from '../schemas/federation-appointments.schema.js';

/** Request body for POST /federation-appointments. */
export class CreateFederationAppointmentDto {
  @ApiProperty()
  @IsMongoId()
  personId: string;

  @ApiProperty({ description: 'The admin-defined post this appointment fills.' })
  @IsMongoId()
  positionId: string;

  @ApiProperty({
    required: false,
    description:
      'The specific prior appointment this one succeeds. When set, that appointment is closed ' +
      '(termEnd = this appointment\'s termStart, status = Completed). Explicit admin choice — ' +
      'no auto-close happens without it.',
  })
  @IsOptional()
  @IsMongoId()
  supersedesAppointmentId?: string;

  @ApiProperty({ required: false, description: 'Required when the assigned position is a committee post.' })
  @IsOptional()
  @IsMongoId()
  committeeId?: string;

  @ApiProperty({
    required: false,
    description: 'Scopes the position\'s duplicate-holder and max-holder checks to this cycle.',
  })
  @IsOptional()
  @IsMongoId()
  electionCycleId?: string;

  @ApiProperty()
  @IsDateString()
  termStart: string;

  @ApiProperty({ required: false, description: 'Omit while the appointment is ongoing.' })
  @IsOptional()
  @IsDateString()
  termEnd?: string;

  @ApiProperty({ enum: APPOINTMENT_STATUSES })
  @IsIn(APPOINTMENT_STATUSES)
  status: AppointmentStatus;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}
