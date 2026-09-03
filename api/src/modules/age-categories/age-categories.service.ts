import { Injectable } from '@nestjs/common';
import type { Types } from 'mongoose';
import { AgeCategoriesRepository } from './age-categories.repository.js';
import type { AgeCategoryDocument } from './schemas/age-category.schema.js';
import { CreateAgeCategoryDto } from './dto/create-age-category.dto.js';

/** Implements: ageCategories collection, Domain 3 (partial; FigJam node
 *  `81:6454`). Plain CRUD, reference data. */
@Injectable()
export class AgeCategoriesService {
  constructor(private readonly repository: AgeCategoriesRepository) {}

  async create(dto: CreateAgeCategoryDto): Promise<AgeCategoryDocument> {
    return this.repository.create(dto);
  }

  async findAll(): Promise<AgeCategoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AgeCategoryDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AgeCategoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
