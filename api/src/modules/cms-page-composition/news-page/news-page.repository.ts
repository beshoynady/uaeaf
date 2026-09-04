import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { NewsPage } from './schemas/news-page.schema.js';
import type { NewsPageDocument } from './schemas/news-page.schema.js';

/** Implements: newsPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class NewsPageRepository extends BaseRepository<NewsPageDocument> {
  constructor(@InjectModel(NewsPage.name) model: Model<NewsPageDocument>) {
    super(model);
  }
}
