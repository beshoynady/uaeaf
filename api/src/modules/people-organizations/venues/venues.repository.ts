import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Venue } from './schemas/venue.schema.js';
import type { VenueDocument } from './schemas/venue.schema.js';

/** Implements: venues collection, Domain 2 — People & Organizations. */
@Injectable()
export class VenuesRepository extends BaseRepository<VenueDocument> {
  constructor(@InjectModel(Venue.name) model: Model<VenueDocument>) {
    super(model);
  }
}
