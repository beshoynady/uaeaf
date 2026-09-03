import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Coach } from './schemas/coach.schema.js';
import type { CoachDocument } from './schemas/coach.schema.js';

/** Implements: coaches collection, Domain 2 — People & Organizations. */
@Injectable()
export class CoachesRepository extends BaseRepository<CoachDocument> {
  constructor(@InjectModel(Coach.name) model: Model<CoachDocument>) {
    super(model);
  }
}
