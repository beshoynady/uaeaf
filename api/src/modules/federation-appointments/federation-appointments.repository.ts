import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { FederationAppointment } from './schemas/federation-appointments.schema.js';
import type { FederationAppointmentDocument } from './schemas/federation-appointments.schema.js';

/** Implements: federationAppointments collection, Domain 1 — Federation & Governance. */
@Injectable()
export class FederationAppointmentsRepository extends BaseRepository<FederationAppointmentDocument> {
  constructor(@InjectModel(FederationAppointment.name) model: Model<FederationAppointmentDocument>) {
    super(model);
  }
}
