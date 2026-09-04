import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { RecordsPage } from './schemas/records-page.schema.js';
import type { RecordsPageDocument } from './schemas/records-page.schema.js';

/** Implements: recordsPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class RecordsPageRepository extends BaseRepository<RecordsPageDocument> {
  constructor(@InjectModel(RecordsPage.name) model: Model<RecordsPageDocument>) {
    super(model);
  }
}
