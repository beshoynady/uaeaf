import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Athlete } from './schemas/athlete.schema.js';
import type { AthleteDocument } from './schemas/athlete.schema.js';

/** Implements: athletes collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthletesRepository extends BaseRepository<AthleteDocument> {
  constructor(@InjectModel(Athlete.name) model: Model<AthleteDocument>) {
    super(model);
  }

  /** Backs the paginated `GET /athletes/public` listing — a DB-level
   *  skip/limit (not an in-memory slice of `find()`) plus the matching
   *  total, so the public listing scales past what fits in memory. */
  async findPaginated(skip: number, limit: number): Promise<{ items: AthleteDocument[]; total: number }> {
    const filter = { archivedAt: null };
    const [items, total] = await Promise.all([
      this.model.find(filter).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
