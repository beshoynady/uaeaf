import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { ClubsPage } from './schemas/clubs-page.schema.js';
import type { ClubsPageDocument } from './schemas/clubs-page.schema.js';

/** Implements: clubsPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class ClubsPageRepository extends BaseRepository<ClubsPageDocument> {
  constructor(@InjectModel(ClubsPage.name) model: Model<ClubsPageDocument>) {
    super(model);
  }
}
