import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { OfficialAssignment } from './schemas/official-assignment.schema.js';
import type { OfficialAssignmentDocument } from './schemas/official-assignment.schema.js';

/** Implements: officialAssignments collection, Domain 2 — People & Organizations. */
@Injectable()
export class OfficialAssignmentsRepository extends BaseRepository<OfficialAssignmentDocument> {
  constructor(@InjectModel(OfficialAssignment.name) model: Model<OfficialAssignmentDocument>) {
    super(model);
  }
}
