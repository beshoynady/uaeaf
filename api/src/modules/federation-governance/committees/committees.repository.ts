import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Committee } from './schemas/committees.schema.js';
import type { CommitteeDocument } from './schemas/committees.schema.js';

/** Implements: committees collection, Domain 1 — Federation & Governance. */
@Injectable()
export class CommitteesRepository extends BaseRepository<CommitteeDocument> {
  constructor(@InjectModel(Committee.name) model: Model<CommitteeDocument>) {
    super(model);
  }
}
