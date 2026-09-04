import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { VisionMissionPage } from './schemas/vision-mission-page.schema.js';
import type { VisionMissionPageDocument } from './schemas/vision-mission-page.schema.js';

/** Implements: visionMissionPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class VisionMissionPagesRepository extends BaseRepository<VisionMissionPageDocument> {
  constructor(@InjectModel(VisionMissionPage.name) model: Model<VisionMissionPageDocument>) {
    super(model);
  }
}
