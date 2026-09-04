import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { PresidentMessagePage } from './schemas/president-message-page.schema.js';
import type { PresidentMessagePageDocument } from './schemas/president-message-page.schema.js';

/** Implements: presidentMessagePage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class PresidentMessagePagesRepository extends BaseRepository<PresidentMessagePageDocument> {
  constructor(@InjectModel(PresidentMessagePage.name) model: Model<PresidentMessagePageDocument>) {
    super(model);
  }
}
