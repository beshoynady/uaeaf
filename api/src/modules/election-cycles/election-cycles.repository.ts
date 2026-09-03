import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { ElectionCycle } from './schemas/election-cycles.schema.js';
import type { ElectionCycleDocument } from './schemas/election-cycles.schema.js';

/** Implements: electionCycles collection, Domain 1 — Federation & Governance. */
@Injectable()
export class ElectionCyclesRepository extends BaseRepository<ElectionCycleDocument> {
  constructor(@InjectModel(ElectionCycle.name) model: Model<ElectionCycleDocument>) {
    super(model);
  }
}
