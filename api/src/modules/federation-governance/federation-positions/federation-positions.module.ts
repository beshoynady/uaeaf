import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FederationPosition, FederationPositionSchema } from './schemas/federation-positions.schema.js';
import { FederationPositionsRepository } from './federation-positions.repository.js';
import { FederationPositionsService } from './federation-positions.service.js';
import { FederationPositionsController } from './federation-positions.controller.js';
import {
  FederationAppointment,
  FederationAppointmentSchema,
} from '../federation-appointments/schemas/federation-appointments.schema.js';

/** Registers the `federationAppointments` schema directly rather than
 *  importing `FederationAppointmentsModule`: that module will come to
 *  import this one, and the reverse import would form a cycle. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FederationPosition.name, schema: FederationPositionSchema },
      { name: FederationAppointment.name, schema: FederationAppointmentSchema },
    ]),
  ],
  controllers: [FederationPositionsController],
  providers: [FederationPositionsRepository, FederationPositionsService],
  exports: [FederationPositionsService, FederationPositionsRepository],
})
export class FederationPositionsModule {}
