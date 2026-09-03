import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { CommitteesPage } from './schemas/committees-page.schema.js';
import type { CommitteesPageDocument } from './schemas/committees-page.schema.js';

/** Implements: committeesPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class CommitteesPagesRepository extends BaseRepository<CommitteesPageDocument> {
  constructor(@InjectModel(CommitteesPage.name) model: Model<CommitteesPageDocument>) {
    super(model);
  }
}
