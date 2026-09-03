import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ElectionCyclesRepository } from './election-cycles.repository.js';
import type { ElectionCycleDocument } from './schemas/election-cycles.schema.js';
import { CreateElectionCycleDto } from './dto/create-election-cycles.dto.js';

/** Implements: electionCycles collection, Domain 1 — Federation &
 *  Governance. Plain CRUD. */
@Injectable()
export class ElectionCyclesService {
  constructor(private readonly repository: ElectionCyclesRepository) {}

  async create(dto: CreateElectionCycleDto): Promise<ElectionCycleDocument> {
    return this.repository.create({
      federationId: new Types.ObjectId(dto.federationId),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      cycleNumber: dto.cycleNumber,
      cycleName: dto.cycleName,
      status: dto.status,
      notes: dto.notes ?? null,
    });
  }

  async findAll(): Promise<ElectionCycleDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<ElectionCycleDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ElectionCycleDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
