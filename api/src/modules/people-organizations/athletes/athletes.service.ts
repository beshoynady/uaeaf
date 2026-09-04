import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthletesRepository } from './athletes.repository.js';
import type { AthleteDocument } from './schemas/athlete.schema.js';
import { CreateAthleteDto } from './dto/create-athlete.dto.js';
import { AthletePublicResponseDto } from './dto/athlete-public-response.dto.js';
import type { AthletePublicListResponseDto } from './dto/athlete-public-list-response.dto.js';

/** Implements: athletes collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6020`). Plain CRUD — the Local/Guest profile-linkage
 *  rule and current-coach/national-team derivation live in
 *  `AthleteProfilesService`/`AthleteCoachHistoryService`/
 *  `AthleteNationalTeamHistoryService` respectively, not here. */
@Injectable()
export class AthletesService {
  constructor(private readonly repository: AthletesRepository) {}

  async create(dto: CreateAthleteDto): Promise<AthleteDocument> {
    return this.repository.create({
      name: dto.name,
      dateOfBirth: new Date(dto.dateOfBirth),
      nationalityId: new Types.ObjectId(dto.nationalityId),
      disciplineIds: (dto.disciplineIds ?? []).map((id) => new Types.ObjectId(id)),
      gender: dto.gender,
      residencyType: dto.residencyType,
      federationName: dto.federationName ?? null,
    });
  }

  async findAll(): Promise<AthleteDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteDocument | null> {
    return this.repository.findById(id);
  }

  /** The sanctioned way for another module to read an athlete's disciplines
   *  — never destructure `.disciplineIds` from a raw document elsewhere, so
   *  a future redesign of this relation doesn't touch the public API shape
   *  (2026-09-03 correction; the redesign itself is flagged, not decided).
   *  @throws NotFoundException when `athleteId` doesn't exist. */
  async getDisciplineIds(athleteId: string): Promise<Types.ObjectId[]> {
    const athlete = await this.findById(athleteId);
    if (!athlete) {
      throw new NotFoundException(`Athlete ${athleteId} not found.`);
    }
    return athlete.disciplineIds;
  }

  /** Every athlete in public-safe form, paginated — backs
   *  `GET /athletes/public`. No pagination convention existed before this
   *  session; `page`/`limit` mirror `PaginationQueryDto`'s defaults. */
  async findAllPublic(page = 1, limit = 50): Promise<AthletePublicListResponseDto> {
    const skip = (page - 1) * limit;
    const { items, total } = await this.repository.findPaginated(skip, limit);
    return { items: items.map((athlete) => this.toPublicResponse(athlete)), total, page, limit };
  }

  /** Maps a full `Athlete` document to its public-safe shape (excludes
   *  `dateOfBirth`) — the only form an unauthenticated reader may see. */
  toPublicResponse(athlete: AthleteDocument): AthletePublicResponseDto {
    return {
      id: athlete._id.toString(),
      name: athlete.name,
      nationalityId: athlete.nationalityId.toString(),
      disciplineIds: athlete.disciplineIds.map((id) => id.toString()),
      gender: athlete.gender,
      residencyType: athlete.residencyType,
      federationName: athlete.federationName,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
