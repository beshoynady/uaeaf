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

  /** The row including `isActive`, which the schema keeps out of ordinary
   *  reads so it can never be frozen into a revision. The two callers that
   *  genuinely need it — the public read, which must know whether to serve the
   *  page, and the dashboard, which draws the switch — ask for it here. */
  async findByIdWithActivation(id: string): Promise<AboutFederationPageDocument | null> {
    return this.model.findOne({ _id: id, archivedAt: null }).select('+isActive').exec();
  }
}
