import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { FederationPersonnel } from './schemas/federation-personnel.schema.js';
import type { FederationPersonnelDocument } from './schemas/federation-personnel.schema.js';

/** Implements: federationPersonnel collection, Domain 1 — Federation & Governance. */
@Injectable()
export class FederationPersonnelsRepository extends BaseRepository<FederationPersonnelDocument> {
  constructor(@InjectModel(FederationPersonnel.name) model: Model<FederationPersonnelDocument>) {
    super(model);
  }
}
