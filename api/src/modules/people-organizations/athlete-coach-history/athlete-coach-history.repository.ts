import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AthleteCoachHistory } from './schemas/athlete-coach-history.schema.js';
import type { AthleteCoachHistoryDocument } from './schemas/athlete-coach-history.schema.js';

/** Implements: athleteCoachHistory collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthleteCoachHistoryRepository extends BaseRepository<AthleteCoachHistoryDocument> {
  constructor(@InjectModel(AthleteCoachHistory.name) model: Model<AthleteCoachHistoryDocument>) {
    super(model);
  }

  /** The row with `endDate: null` for this athlete, if any — their current coach. */
  async findCurrent(athleteId: Types.ObjectId): Promise<AthleteCoachHistoryDocument | null> {
    return this.findOne({ athleteId, endDate: null });
  }
}
