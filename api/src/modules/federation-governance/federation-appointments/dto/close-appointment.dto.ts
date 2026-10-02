import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn } from 'class-validator';
import { APPOINTMENT_END_REASONS } from '../schemas/federation-appointments.schema.js';
import type { AppointmentEndReason } from '../schemas/federation-appointments.schema.js';

/** Request body for PATCH /federation-appointments/:id/close. Closes with a
 *  date and a reason — there is no delete path for an appointment. */
export class CloseAppointmentDto {
  @ApiProperty()
  @IsDateString()
  termEnd: string;

  @ApiProperty({ enum: APPOINTMENT_END_REASONS })
  @IsIn(APPOINTMENT_END_REASONS)
  endReason: AppointmentEndReason;
}
