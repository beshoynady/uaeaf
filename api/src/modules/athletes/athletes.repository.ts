import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Athlete } from './schemas/athlete.schema.js';
import type { AthleteDocument } from './schemas/athlete.schema.js';

/** Implements: athletes collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthletesRepository extends BaseRepository<AthleteDocument> {
  constructor(@InjectModel(Athlete.name) model: Model<AthleteDocument>) {
    super(model);
  }
}
