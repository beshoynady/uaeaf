import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FederationAppointment, FederationAppointmentSchema } from './schemas/federation-appointments.schema.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsController } from './federation-appointments.controller.js';
import { AppointmentRulesService } from './appointment-rules.service.js';
import { FederationPersonnelsModule } from '../federation-personnel/federation-personnel.module.js';
import { FederationPositionsModule } from '../federation-positions/federation-positions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FederationAppointment.name, schema: FederationAppointmentSchema }]),
    // The public leadership read joins each appointment to the person holding
    // it; the names and portraits live in the personnel module.
    FederationPersonnelsModule,
    // One-way: this module imports positions, never the reverse.
    FederationPositionsModule,
  ],
  controllers: [FederationAppointmentsController],
  providers: [FederationAppointmentsRepository, FederationAppointmentsService, AppointmentRulesService],
  exports: [FederationAppointmentsService],
})
export class FederationAppointmentsModule {}
