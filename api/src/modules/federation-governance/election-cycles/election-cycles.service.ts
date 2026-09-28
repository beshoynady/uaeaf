import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ElectionCyclesRepository } from './election-cycles.repository.js';
import type { ElectionCycleDocument } from './schemas/election-cycles.schema.js';
import { CreateElectionCycleDto } from './dto/create-election-cycles.dto.js';
import { UpdateElectionCycleDto } from './dto/update-election-cycles.dto.js';
import { partialUpdate, setObjectIdField, setDateField } from '../../../common/utils/partial-update.util.js';

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

  /** `federationId`/`startDate`/`endDate` are all `required: true` in the
   *  schema (Fix round 2) — none has a valid "no value" state, so `null` is
   *  refused for each rather than silently becoming a fresh random id or
   *  the Unix epoch, which is what the bare `new Types.ObjectId`/`new Date`
   *  calls this replaced did.
   *  @throws NotFoundException when no such election cycle exists. */
  async update(id: string, dto: UpdateElectionCycleDto): Promise<ElectionCycleDocument> {
    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'federationId', { nullable: false });
    setDateField(update, dto, 'startDate', { nullable: false });
    setDateField(update, dto, 'endDate', { nullable: false });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Election cycle ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ElectionCycleDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<ElectionCycleDocument | null> {
    return this.repository.restore(id);
  }
}
