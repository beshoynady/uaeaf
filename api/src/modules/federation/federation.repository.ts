import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Federation } from './schemas/federation.schema.js';
import type { FederationDocument } from './schemas/federation.schema.js';

/** Implements: federation collection, Domain 1 — Federation & Governance. */
@Injectable()
export class FederationsRepository extends BaseRepository<FederationDocument> {
  constructor(@InjectModel(Federation.name) model: Model<FederationDocument>) {
    super(model);
  }
}
