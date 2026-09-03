import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { ResultsRankingsPage } from './schemas/results-rankings-page.schema.js';
import type { ResultsRankingsPageDocument } from './schemas/results-rankings-page.schema.js';

/** Implements: resultsRankingsPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class ResultsRankingsPageRepository extends BaseRepository<ResultsRankingsPageDocument> {
  constructor(@InjectModel(ResultsRankingsPage.name) model: Model<ResultsRankingsPageDocument>) {
    super(model);
  }
}
