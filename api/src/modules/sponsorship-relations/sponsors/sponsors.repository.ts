import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Sponsor } from './schemas/sponsor.schema.js';
import type { SponsorDocument } from './schemas/sponsor.schema.js';

/** Implements: sponsors collection, Domain 9. */
@Injectable()
export class SponsorsRepository extends BaseRepository<SponsorDocument> {
  constructor(@InjectModel(Sponsor.name) model: Model<SponsorDocument>) {
    super(model);
  }
}
