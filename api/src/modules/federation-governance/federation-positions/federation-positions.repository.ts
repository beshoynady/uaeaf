import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ClientSession, QueryFilter } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { FederationPosition } from './schemas/federation-positions.schema.js';
import type { FederationPositionDocument } from './schemas/federation-positions.schema.js';

/** Implements: federationPositions collection, Domain 1 — Federation & Governance. */
@Injectable()
export class FederationPositionsRepository extends BaseRepository<FederationPositionDocument> {
  constructor(@InjectModel(FederationPosition.name) model: Model<FederationPositionDocument>) {
    super(model);
  }

  /** Session-scoped sibling of `findById`, for `AppointmentRulesService`'s
   *  read inside another caller's transaction. */
  async findByIdInSession(id: string, session: ClientSession): Promise<FederationPositionDocument | null> {
    return this.model
      .findOne({ _id: id, archivedAt: null } as QueryFilter<FederationPositionDocument>)
      .session(session)
      .exec();
  }
}
