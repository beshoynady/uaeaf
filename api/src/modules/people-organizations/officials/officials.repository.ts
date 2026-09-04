import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Official } from './schemas/official.schema.js';
import type { OfficialDocument } from './schemas/official.schema.js';

/** Implements: officials collection, Domain 2 — People & Organizations. */
@Injectable()
export class OfficialsRepository extends BaseRepository<OfficialDocument> {
  constructor(@InjectModel(Official.name) model: Model<OfficialDocument>) {
    super(model);
  }

  /** Backs the paginated `GET /officials/public` listing — mirrors
   *  `AthletesRepository.findPaginated()`. */
  async findPaginated(skip: number, limit: number): Promise<{ items: OfficialDocument[]; total: number }> {
    const filter = { archivedAt: null };
    const [items, total] = await Promise.all([
      this.model.find(filter).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
