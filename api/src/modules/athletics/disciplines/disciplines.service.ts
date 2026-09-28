import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DisciplinesRepository } from './disciplines.repository.js';
import type { DisciplineDocument } from './schemas/discipline.schema.js';
import { CreateDisciplineDto } from './dto/create-discipline.dto.js';
import { UpdateDisciplineDto } from './dto/update-discipline.dto.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

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

  /** `coverImage` is nullable on the schema (`default: null`) — `{ coverImage:
   *  null }` clears it via `setObjectIdField`, the fix for the Fix round 2
   *  defect where a bare `new Types.ObjectId(dto.coverImage)` minted a fresh
   *  random id for that exact request instead.
   *  @throws NotFoundException when no such discipline exists. */
  async update(id: string, dto: UpdateDisciplineDto): Promise<DisciplineDocument> {
    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'coverImage', { nullable: true });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Discipline ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<DisciplineDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<DisciplineDocument | null> {
    return this.repository.restore(id);
  }
}
