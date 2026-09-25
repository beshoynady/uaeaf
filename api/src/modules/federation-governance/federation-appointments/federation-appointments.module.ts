import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FederationAppointment, FederationAppointmentSchema } from './schemas/federation-appointments.schema.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsController } from './federation-appointments.controller.js';
import { FederationPersonnelsModule } from '../federation-personnel/federation-personnel.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FederationAppointment.name, schema: FederationAppointmentSchema }]),
    // The public leadership read joins each appointment to the person holding
    // it; the names and portraits live in the personnel module.
    FederationPersonnelsModule,
  ],
  controllers: [FederationAppointmentsController],
  providers: [FederationAppointmentsRepository, FederationAppointmentsService],
  exports: [FederationAppointmentsService],
})
export class FederationAppointmentsModule {}
