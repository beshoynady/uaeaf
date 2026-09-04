import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AthleteNationalTeamHistory } from './schemas/athlete-national-team-history.schema.js';
import type { AthleteNationalTeamHistoryDocument } from './schemas/athlete-national-team-history.schema.js';

/** Implements: athleteNationalTeamHistory collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthleteNationalTeamHistoryRepository extends BaseRepository<AthleteNationalTeamHistoryDocument> {
  constructor(@InjectModel(AthleteNationalTeamHistory.name) model: Model<AthleteNationalTeamHistoryDocument>) {
    super(model);
  }

  /** The row with `endDate: null` for this athlete, if any — they're
   *  currently on that national-team roster. */
  async findCurrent(athleteId: Types.ObjectId): Promise<AthleteNationalTeamHistoryDocument | null> {
    return this.findOne({ athleteId, endDate: null });
  }
}
