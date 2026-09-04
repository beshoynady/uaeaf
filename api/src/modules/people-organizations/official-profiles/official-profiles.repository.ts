import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { OfficialProfile } from './schemas/official-profile.schema.js';
import type { OfficialProfileDocument } from './schemas/official-profile.schema.js';

/** Implements: officialProfiles collection, Domain 2 — People & Organizations. */
@Injectable()
export class OfficialProfilesRepository extends BaseRepository<OfficialProfileDocument> {
  constructor(@InjectModel(OfficialProfile.name) model: Model<OfficialProfileDocument>) {
    super(model);
  }

  async findByOfficial(officialId: Types.ObjectId): Promise<OfficialProfileDocument | null> {
    return this.findOne({ officialId });
  }

  /** The public routing lookup: `officialProfiles.slug` is now the sole
   *  public identifier for an official (2026-09-03 correction). */
  async findBySlug(slug: string): Promise<OfficialProfileDocument | null> {
    return this.findOne({ slug });
  }
}
