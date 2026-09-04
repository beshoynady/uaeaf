import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { AgeCategory } from './schemas/age-category.schema.js';
import type { AgeCategoryDocument } from './schemas/age-category.schema.js';

/** Implements: ageCategories collection, Domain 3 (partial). */
@Injectable()
export class AgeCategoriesRepository extends BaseRepository<AgeCategoryDocument> {
  constructor(@InjectModel(AgeCategory.name) model: Model<AgeCategoryDocument>) {
    super(model);
  }
}
