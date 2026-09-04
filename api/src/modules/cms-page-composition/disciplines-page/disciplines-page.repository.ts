import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { DisciplinesPage } from './schemas/disciplines-page.schema.js';
import type { DisciplinesPageDocument } from './schemas/disciplines-page.schema.js';

/** Implements: disciplinesPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class DisciplinesPageRepository extends BaseRepository<DisciplinesPageDocument> {
  constructor(@InjectModel(DisciplinesPage.name) model: Model<DisciplinesPageDocument>) {
    super(model);
  }
}
