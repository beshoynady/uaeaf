import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ClientSession, QueryFilter, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { FederationAppointment } from './schemas/federation-appointments.schema.js';
import type { FederationAppointmentDocument } from './schemas/federation-appointments.schema.js';

/** Implements: federationAppointments collection, Domain 1 — Federation & Governance. */
@Injectable()
export class FederationAppointmentsRepository extends BaseRepository<FederationAppointmentDocument> {
  constructor(@InjectModel(FederationAppointment.name) model: Model<FederationAppointmentDocument>) {
    super(model);
  }

  /** Session-scoped sibling of `find`, for `replaceChairOfCommittee`'s
   *  transaction — the only caller that must read inside its own session. */
  async findInSession(
    filter: QueryFilter<FederationAppointmentDocument>,
    session: ClientSession,
  ): Promise<FederationAppointmentDocument[]> {
    return this.model
      .find({ ...filter, archivedAt: null } as QueryFilter<FederationAppointmentDocument>)
      .session(session)
      .exec();
  }

  /** Session-scoped sibling of `updateById`, for the same transaction. */
  async updateByIdInSession(
    id: string,
    update: UpdateQuery<FederationAppointmentDocument>,
    session: ClientSession,
  ): Promise<FederationAppointmentDocument | null> {
    return this.model.findByIdAndUpdate(id, update, { returnDocument: 'after', session }).exec();
  }

  /** Session-scoped sibling of `create`, for the same transaction. Routed
   *  through the array form: the single-document overload takes no options. */
  async createInSession(
    data: Partial<FederationAppointmentDocument>,
    session: ClientSession,
  ): Promise<FederationAppointmentDocument> {
    const [created] = await this.model.create([data], { session });
    return created;
  }
}
