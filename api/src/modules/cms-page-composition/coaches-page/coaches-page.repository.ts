import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { CoachesPage } from './schemas/coaches-page.schema.js';
import type { CoachesPageDocument } from './schemas/coaches-page.schema.js';

/** Implements: coachesPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class CoachesPageRepository extends BaseRepository<CoachesPageDocument> {
  constructor(@InjectModel(CoachesPage.name) model: Model<CoachesPageDocument>) {
    super(model);
  }
}
