import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { QueryFilter, UpdateQuery } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { StrategicPlansPage } from './schemas/strategic-plans-page.schema.js';
import type { StrategicPlansPageDocument } from './schemas/strategic-plans-page.schema.js';

/** Implements: strategicPlansPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class StrategicPlansPagesRepository extends BaseRepository<StrategicPlansPageDocument> {
  constructor(@InjectModel(StrategicPlansPage.name) model: Model<StrategicPlansPageDocument>) {
    super(model);
  }

  /** Writes only when the live row still carries the `updatedAt` the caller
   *  read, in one statement, so no save can land between the check and the
   *  write. `null` when the row changed, was archived, or does not exist. */
  async updateIfUnchanged(
    id: string,
    updatedAt: Date,
    update: UpdateQuery<StrategicPlansPageDocument>,
  ): Promise<StrategicPlansPageDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, updatedAt, archivedAt: null } as QueryFilter<StrategicPlansPageDocument>,
        update,
        { returnDocument: 'after' },
      )
      .exec();
  }
}
