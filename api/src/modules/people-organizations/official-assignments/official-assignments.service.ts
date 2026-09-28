import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialAssignmentsRepository } from './official-assignments.repository.js';
import type { OfficialAssignmentDocument } from './schemas/official-assignment.schema.js';
import { CreateOfficialAssignmentDto } from './dto/create-official-assignment.dto.js';
import { UpdateOfficialAssignmentDto } from './dto/update-official-assignment.dto.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

/** Implements: officialAssignments collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6340`). Plain CRUD. */
@Injectable()
export class OfficialAssignmentsService {
  constructor(private readonly repository: OfficialAssignmentsRepository) {}

  async create(dto: CreateOfficialAssignmentDto): Promise<OfficialAssignmentDocument> {
    return this.repository.create({
      officialId: new Types.ObjectId(dto.officialId),
      role: dto.role,
      targetType: dto.targetType,
      targetId: new Types.ObjectId(dto.targetId),
    });
  }

  async findAll(): Promise<OfficialAssignmentDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<OfficialAssignmentDocument | null> {
    return this.repository.findById(id);
  }

  /** `officialId` and `targetId` are both `required: true` in the schema
   *  (Fix round 2 — read from `official-assignment.schema.ts`); neither has
   *  a valid "no value" state.
   *  @throws NotFoundException when no such assignment exists. */
  async update(id: string, dto: UpdateOfficialAssignmentDto): Promise<OfficialAssignmentDocument> {
    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'officialId', { nullable: false });
    setObjectIdField(update, dto, 'targetId', { nullable: false });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Official assignment ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<OfficialAssignmentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<OfficialAssignmentDocument | null> {
    return this.repository.restore(id);
  }
}
