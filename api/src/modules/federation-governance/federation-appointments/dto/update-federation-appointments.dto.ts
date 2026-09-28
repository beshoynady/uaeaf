import { PartialType } from '@nestjs/swagger';
import { CreateFederationAppointmentDto } from './create-federation-appointments.dto.js';

/** Request body for PATCH /federation-appointments/:id. Every field
 *  optional; omitting one leaves it unchanged.
 *
 *  The succession side-effect `create()` runs when `supersedesAppointmentId`
 *  is given (closing the superseded row) is a creation-time transaction, not
 *  re-run here — editing an appointment's own fields is a different
 *  operation from recording a succession. */
export class UpdateFederationAppointmentDto extends PartialType(CreateFederationAppointmentDto, { skipNullProperties: false }) {}
