import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AboutFederationPage } from './schemas/about-federation-page.schema.js';
import type { AboutFederationPageDocument } from './schemas/about-federation-page.schema.js';

/** Implements: aboutFederationPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class AboutFederationPagesRepository extends BaseRepository<AboutFederationPageDocument> {
  constructor(@InjectModel(AboutFederationPage.name) model: Model<AboutFederationPageDocument>) {
    super(model);
  }
}
