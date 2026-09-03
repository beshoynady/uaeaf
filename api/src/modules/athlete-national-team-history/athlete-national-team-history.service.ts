import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteNationalTeamHistoryRepository } from './athlete-national-team-history.repository.js';
import type { AthleteNationalTeamHistoryDocument } from './schemas/athlete-national-team-history.schema.js';
import { CreateAthleteNationalTeamHistoryDto } from './dto/create-athlete-national-team-history.dto.js';

/** Implements: athleteNationalTeamHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `559:8224`). */
@Injectable()
export class AthleteNationalTeamHistoryService {
  constructor(private readonly repository: AthleteNationalTeamHistoryRepository) {}

  async create(dto: CreateAthleteNationalTeamHistoryDto): Promise<AthleteNationalTeamHistoryDocument> {
    return this.repository.create({
      athleteId: new Types.ObjectId(dto.athleteId),
      ageCategoryId: new Types.ObjectId(dto.ageCategoryId),
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }

  async findAll(): Promise<AthleteNationalTeamHistoryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteNationalTeamHistoryDocument | null> {
    return this.repository.findById(id);
  }

  /** Confirmed decision #2: `athletes` has no `isNationalTeam` field — this
   *  is the sole way to determine current national-team status. */
  async isCurrentlyOnNationalTeam(athleteId: string): Promise<boolean> {
    const current = await this.repository.findCurrent(new Types.ObjectId(athleteId));
    return current !== null;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteNationalTeamHistoryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
