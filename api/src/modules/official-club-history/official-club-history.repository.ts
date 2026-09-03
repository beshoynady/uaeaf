import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { OfficialClubHistory } from './schemas/official-club-history.schema.js';
import type { OfficialClubHistoryDocument } from './schemas/official-club-history.schema.js';

/** Implements: officialClubHistory collection, Domain 2 — People & Organizations. */
@Injectable()
export class OfficialClubHistoryRepository extends BaseRepository<OfficialClubHistoryDocument> {
  constructor(@InjectModel(OfficialClubHistory.name) model: Model<OfficialClubHistoryDocument>) {
    super(model);
  }

  /** The row with `endDate: null` for this official, if any — their current club. */
  async findCurrent(officialId: Types.ObjectId): Promise<OfficialClubHistoryDocument | null> {
    return this.findOne({ officialId, endDate: null });
  }
}
