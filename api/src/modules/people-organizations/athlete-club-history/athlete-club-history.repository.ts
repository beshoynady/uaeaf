import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AthleteClubHistory } from './schemas/athlete-club-history.schema.js';
import type { AthleteClubHistoryDocument } from './schemas/athlete-club-history.schema.js';

/** Implements: athleteClubHistory collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthleteClubHistoryRepository extends BaseRepository<AthleteClubHistoryDocument> {
  constructor(@InjectModel(AthleteClubHistory.name) model: Model<AthleteClubHistoryDocument>) {
    super(model);
  }

  /** The row with `endDate: null` for this athlete, if any — their current club. */
  async findCurrent(athleteId: Types.ObjectId): Promise<AthleteClubHistoryDocument | null> {
    return this.findOne({ athleteId, endDate: null });
  }
}
