import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { DisciplinesRepository } from './disciplines.repository.js';
import type { DisciplineDocument } from './schemas/discipline.schema.js';
import { CreateDisciplineDto } from './dto/create-discipline.dto.js';

/** Implements: disciplines collection, Domain 3 (partial; FigJam node
 *  `289:4472`). Plain CRUD, reference data used by athletes/coaches/
 *  officials.disciplineIds and athleteCoachHistory.disciplineId. */
@Injectable()
export class DisciplinesService {
  constructor(private readonly repository: DisciplinesRepository) {}

  async create(dto: CreateDisciplineDto): Promise<DisciplineDocument> {
    return this.repository.create({
      ...dto,
      coverImage: dto.coverImage ? new Types.ObjectId(dto.coverImage) : null,
    });
  }

  async findAll(): Promise<DisciplineDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<DisciplineDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<DisciplineDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
