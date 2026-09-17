import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Partnership } from './schemas/partnership.schema.js';
import type { PartnershipDocument } from './schemas/partnership.schema.js';

/** Implements: partnerships collection, Domain 9. */
@Injectable()
export class PartnershipsRepository extends BaseRepository<PartnershipDocument> {
  constructor(@InjectModel(Partnership.name) model: Model<PartnershipDocument>) {
    super(model);
  }
}
