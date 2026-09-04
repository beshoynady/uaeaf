import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { CoachClubHistory } from './schemas/coach-club-history.schema.js';
import type { CoachClubHistoryDocument } from './schemas/coach-club-history.schema.js';

/** Implements: coachClubHistory collection, Domain 2 — People & Organizations. */
@Injectable()
export class CoachClubHistoryRepository extends BaseRepository<CoachClubHistoryDocument> {
  constructor(@InjectModel(CoachClubHistory.name) model: Model<CoachClubHistoryDocument>) {
    super(model);
  }

  /** The row with `endDate: null` for this coach, if any — their current club. */
  async findCurrent(coachId: Types.ObjectId): Promise<CoachClubHistoryDocument | null> {
    return this.findOne({ coachId, endDate: null });
  }
}
