import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FederationAppointment, FederationAppointmentSchema } from './schemas/federation-appointments.schema.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsController } from './federation-appointments.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FederationAppointment.name, schema: FederationAppointmentSchema }]),
  ],
  controllers: [FederationAppointmentsController],
  providers: [FederationAppointmentsRepository, FederationAppointmentsService],
  exports: [FederationAppointmentsService],
})
export class FederationAppointmentsModule {}
