import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AlbumsPage } from './schemas/albums-page.schema.js';
import type { AlbumsPageDocument } from './schemas/albums-page.schema.js';

/** Implements: albumsPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class AlbumsPageRepository extends BaseRepository<AlbumsPageDocument> {
  constructor(@InjectModel(AlbumsPage.name) model: Model<AlbumsPageDocument>) {
    super(model);
  }
}
