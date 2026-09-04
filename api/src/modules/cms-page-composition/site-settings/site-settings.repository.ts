import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { SiteSettings } from './schemas/site-settings.schema.js';
import type { SiteSettingsDocument } from './schemas/site-settings.schema.js';

/** Implements: siteSettings collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class SiteSettingsRepository extends BaseRepository<SiteSettingsDocument> {
  constructor(@InjectModel(SiteSettings.name) model: Model<SiteSettingsDocument>) {
    super(model);
  }
}
