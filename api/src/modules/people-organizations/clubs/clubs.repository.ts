import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Club } from './schemas/club.schema.js';
import type { ClubDocument } from './schemas/club.schema.js';

/** Implements: clubs collection, Domain 2 — People & Organizations. */
@Injectable()
export class ClubsRepository extends BaseRepository<ClubDocument> {
  constructor(@InjectModel(Club.name) model: Model<ClubDocument>) {
    super(model);
  }
}
