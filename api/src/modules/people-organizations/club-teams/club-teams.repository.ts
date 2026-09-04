import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { ClubTeam } from './schemas/club-team.schema.js';
import type { ClubTeamDocument } from './schemas/club-team.schema.js';

/** Implements: clubTeams collection, Domain 2 — People & Organizations. */
@Injectable()
export class ClubTeamsRepository extends BaseRepository<ClubTeamDocument> {
  constructor(@InjectModel(ClubTeam.name) model: Model<ClubTeamDocument>) {
    super(model);
  }
}
