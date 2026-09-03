import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Page } from './schemas/pages.schema.js';
import type { PageDocument } from './schemas/pages.schema.js';

/** Implements: pages collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class PagesRepository extends BaseRepository<PageDocument> {
  constructor(@InjectModel(Page.name) model: Model<PageDocument>) {
    super(model);
  }
}
