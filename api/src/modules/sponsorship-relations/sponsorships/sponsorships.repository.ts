import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Sponsorship } from './schemas/sponsorship.schema.js';
import type { SponsorshipDocument } from './schemas/sponsorship.schema.js';

/** Implements: sponsorships collection, Domain 9. */
@Injectable()
export class SponsorshipsRepository extends BaseRepository<SponsorshipDocument> {
  constructor(@InjectModel(Sponsorship.name) model: Model<SponsorshipDocument>) {
    super(model);
  }
}
