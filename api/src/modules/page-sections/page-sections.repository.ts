import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { PageSection } from './schemas/page-sections.schema.js';
import type { PageSectionDocument } from './schemas/page-sections.schema.js';

/** Implements: pageSections collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class PageSectionsRepository extends BaseRepository<PageSectionDocument> {
  constructor(@InjectModel(PageSection.name) model: Model<PageSectionDocument>) {
    super(model);
  }
}
