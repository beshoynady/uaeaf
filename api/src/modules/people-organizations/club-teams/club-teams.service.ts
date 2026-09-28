import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClubTeamsRepository } from './club-teams.repository.js';
import type { ClubTeamDocument } from './schemas/club-team.schema.js';
import { CreateClubTeamDto } from './dto/create-club-team.dto.js';
import { UpdateClubTeamDto } from './dto/update-club-team.dto.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

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

  /** @throws NotFoundException when no such club team exists. */
  async update(id: string, dto: UpdateClubTeamDto): Promise<ClubTeamDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Club team ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ClubTeamDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<ClubTeamDocument | null> {
    return this.repository.restore(id);
  }
}
