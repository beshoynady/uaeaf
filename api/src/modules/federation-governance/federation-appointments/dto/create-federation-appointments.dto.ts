import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { APPOINTMENT_ROLE_TYPES, APPOINTMENT_STATUSES } from '../schemas/federation-appointments.schema.js';
import type { AppointmentRoleType, AppointmentStatus } from '../schemas/federation-appointments.schema.js';

/** Request body for POST /federation-appointments. */
export class CreateFederationAppointmentDto {
  @ApiProperty()
  @IsMongoId()
  personId: string;

  @ApiProperty({
    required: false,
    description:
      'The specific prior appointment this one succeeds. When set, that appointment is closed ' +
      '(termEnd = this appointment\'s termStart, status = Completed). Explicit admin choice — ' +
      'no roleType-based auto-close happens without it.',
  })
  @IsOptional()
  @IsMongoId()
  supersedesAppointmentId?: string;

  @ApiProperty({ enum: APPOINTMENT_ROLE_TYPES })
  @IsIn(APPOINTMENT_ROLE_TYPES)
  roleType: AppointmentRoleType;

  @ApiProperty({ type: LocalizedTextDto, description: 'e.g. "نائب الرئيس".' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  positionTitle: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'For CommitteeChair/CommitteeMember roleTypes.' })
  @IsOptional()
  @IsMongoId()
  committeeId?: string;

  @ApiProperty({ required: false, description: 'For President/BoardMember roleTypes.' })
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
