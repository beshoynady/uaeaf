import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteCoachHistoryRepository } from './athlete-coach-history.repository.js';
import type { AthleteCoachHistoryDocument } from './schemas/athlete-coach-history.schema.js';
import { CreateAthleteCoachHistoryDto } from './dto/create-athlete-coach-history.dto.js';

/** Implements: athleteCoachHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `559:8223`). */
@Injectable()
export class AthleteCoachHistoryService {
  constructor(private readonly repository: AthleteCoachHistoryRepository) {}

  async create(dto: CreateAthleteCoachHistoryDto): Promise<AthleteCoachHistoryDocument> {
    return this.repository.create({
      athleteId: new Types.ObjectId(dto.athleteId),
      coachId: new Types.ObjectId(dto.coachId),
      disciplineId: dto.disciplineId ? new Types.ObjectId(dto.disciplineId) : null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }

  async findAll(): Promise<AthleteCoachHistoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteCoachHistoryDocument | null> {
    return this.repository.findById(id);
  }

  /** Confirmed decision #2: `athletes` has no `coachId` field — this is the
   *  sole way to determine an athlete's current coach. */
  async getCurrentCoach(athleteId: string): Promise<AthleteCoachHistoryDocument | null> {
    return this.repository.findCurrent(new Types.ObjectId(athleteId));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteCoachHistoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
