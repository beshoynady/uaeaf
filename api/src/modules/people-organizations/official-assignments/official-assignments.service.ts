import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialAssignmentsRepository } from './official-assignments.repository.js';
import type { OfficialAssignmentDocument } from './schemas/official-assignment.schema.js';
import { CreateOfficialAssignmentDto } from './dto/create-official-assignment.dto.js';

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

  async remove(id: string, archivedBy: Types.ObjectId): Promise<OfficialAssignmentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
