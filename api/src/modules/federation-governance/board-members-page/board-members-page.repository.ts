import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { BoardMembersPage } from './schemas/board-members-page.schema.js';
import type { BoardMembersPageDocument } from './schemas/board-members-page.schema.js';

/** Implements: boardMembersPage collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class BoardMembersPageRepository extends BaseRepository<BoardMembersPageDocument> {
  constructor(@InjectModel(BoardMembersPage.name) model: Model<BoardMembersPageDocument>) {
    super(model);
  }
}
