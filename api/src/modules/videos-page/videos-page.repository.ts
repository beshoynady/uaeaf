import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { VideosPage } from './schemas/videos-page.schema.js';
import type { VideosPageDocument } from './schemas/videos-page.schema.js';

/** Implements: videosPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class VideosPageRepository extends BaseRepository<VideosPageDocument> {
  constructor(@InjectModel(VideosPage.name) model: Model<VideosPageDocument>) {
    super(model);
  }
}
