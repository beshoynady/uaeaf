import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { AthleteGuardianRelationship } from './schemas/athlete-guardian-relationship.schema.js';
import type { AthleteGuardianRelationshipDocument } from './schemas/athlete-guardian-relationship.schema.js';

/** Implements: athleteGuardianRelationships collection, Domain 2 — People & Organizations. */
@Injectable()
export class AthleteGuardianRelationshipsRepository extends BaseRepository<AthleteGuardianRelationshipDocument> {
  constructor(@InjectModel(AthleteGuardianRelationship.name) model: Model<AthleteGuardianRelationshipDocument>) {
    super(model);
  }
}
