import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClubTeamsRepository } from './club-teams.repository.js';
import type { ClubTeamDocument } from './schemas/club-team.schema.js';
import { CreateClubTeamDto } from './dto/create-club-team.dto.js';

/** Implements: clubTeams collection, Domain 2 — People & Organizations
 *  (FigJam node `261:4352`). Plain CRUD. */
@Injectable()
export class ClubTeamsService {
  constructor(private readonly repository: ClubTeamsRepository) {}

  async create(dto: CreateClubTeamDto): Promise<ClubTeamDocument> {
    return this.repository.create({
      clubId: new Types.ObjectId(dto.clubId),
      name: dto.name,
      ageCategoryId: new Types.ObjectId(dto.ageCategoryId),
      gender: dto.gender,
      athleteIds: (dto.athleteIds ?? []).map((id) => new Types.ObjectId(id)),
    });
  }

  async findAll(): Promise<ClubTeamDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<ClubTeamDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ClubTeamDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
