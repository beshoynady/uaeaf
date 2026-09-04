import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Discipline } from './schemas/discipline.schema.js';
import type { DisciplineDocument } from './schemas/discipline.schema.js';

/** Implements: disciplines collection, Domain 3 (partial). */
@Injectable()
export class DisciplinesRepository extends BaseRepository<DisciplineDocument> {
  constructor(@InjectModel(Discipline.name) model: Model<DisciplineDocument>) {
    super(model);
  }
}
