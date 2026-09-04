import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { StrategicPlansPage } from './schemas/strategic-plans-page.schema.js';
import type { StrategicPlansPageDocument } from './schemas/strategic-plans-page.schema.js';

/** Implements: strategicPlansPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class StrategicPlansPagesRepository extends BaseRepository<StrategicPlansPageDocument> {
  constructor(@InjectModel(StrategicPlansPage.name) model: Model<StrategicPlansPageDocument>) {
    super(model);
  }
}
