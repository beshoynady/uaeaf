import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsMongoId } from 'class-validator';
import { APPOINTMENT_END_REASONS } from '../schemas/federation-appointments.schema.js';
import type { AppointmentEndReason } from '../schemas/federation-appointments.schema.js';

/** Request body for POST /federation-appointments/committees/:committeeId/chair
 *  — the committee is the path's, not the body's. Closes every open holder of
 *  `positionId`/`cycleId` with `endReason`, then opens the new one. */
export class ReplaceChairDto {
  @ApiProperty()
  @IsMongoId()
  cycleId: string;

  @ApiProperty()
  @IsMongoId()
  positionId: string;

  @ApiProperty()
  @IsMongoId()
  personId: string;

  @ApiProperty()
  @IsDateString()
  termStart: string;

  @ApiProperty({ enum: APPOINTMENT_END_REASONS, description: 'Closes the outgoing chair with this reason.' })
  @IsIn(APPOINTMENT_END_REASONS)
  endReason: AppointmentEndReason;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}
