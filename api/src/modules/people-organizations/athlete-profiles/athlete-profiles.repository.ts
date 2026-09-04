import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AthleteProfile } from './schemas/athlete-profile.schema.js';
import type { AthleteProfileDocument } from './schemas/athlete-profile.schema.js';

/** Implements: athleteProfiles collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthleteProfilesRepository extends BaseRepository<AthleteProfileDocument> {
  constructor(@InjectModel(AthleteProfile.name) model: Model<AthleteProfileDocument>) {
    super(model);
  }

  async findByAthlete(athleteId: Types.ObjectId): Promise<AthleteProfileDocument | null> {
    return this.findOne({ athleteId });
  }

  /** The public routing lookup: `athleteProfiles.slug` is now the sole
   *  public identifier for an athlete (2026-09-03 correction). */
  async findBySlug(slug: string): Promise<AthleteProfileDocument | null> {
    return this.findOne({ slug });
  }
}
