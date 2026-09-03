import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { AthletesPage } from './schemas/athletes-page.schema.js';
import type { AthletesPageDocument } from './schemas/athletes-page.schema.js';

/** Implements: athletesPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class AthletesPageRepository extends BaseRepository<AthletesPageDocument> {
  constructor(@InjectModel(AthletesPage.name) model: Model<AthletesPageDocument>) {
    super(model);
  }
}
