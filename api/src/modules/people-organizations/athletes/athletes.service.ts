import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthletesRepository } from './athletes.repository.js';
import type { AthleteDocument } from './schemas/athlete.schema.js';
import { CreateAthleteDto } from './dto/create-athlete.dto.js';
import { AthletePublicResponseDto } from './dto/athlete-public-response.dto.js';
import type { AthletePublicListResponseDto } from './dto/athlete-public-list-response.dto.js';
import { toCsv, type CsvColumn } from '../../../common/utils/csv.util.js';

/** Column order for `athletes:Export`. Bilingual fields become two columns
 *  so neither language is lost to the other. */
const ATHLETE_EXPORT_COLUMNS: readonly CsvColumn[] = [
  { key: 'name.ar', header: 'Name (AR)' },
  { key: 'name.en', header: 'Name (EN)' },
  { key: 'gender', header: 'Gender' },
  { key: 'dateOfBirth', header: 'Date of birth' },
  { key: 'residencyType', header: 'Residency' },
  { key: 'federationName.ar', header: 'Federation (AR)' },
  { key: 'federationName.en', header: 'Federation (EN)' },
];

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

  /**
   * Every live athlete as a spreadsheet, behind `athletes:Export`.
   *
   * Reads through `find()` so the export inherits the soft-delete scope —
   * an export that bypassed it would hand out records the platform treats
   * as deleted.
   *
   * The reference columns (`nationalityId`, `disciplineIds`) are absent
   * rather than dumped as ObjectIds: a spreadsheet of `68a9f...` answers no
   * question anyone opens this file to ask. Resolving them to country and
   * discipline names needs a join and is a separate slice — see the build
   * plan. `dateOfBirth` IS included: it is `[SENSITIVE-MINOR]` (ADR-0028)
   * and so absent from the public shape, but anyone holding `Export` also
   * holds `Read`, which already returns it per record.
   */
  async exportCsv(): Promise<string> {
    return toCsv(
      (await this.repository.find()) as unknown as Record<string, unknown>[],
      ATHLETE_EXPORT_COLUMNS,
    );
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
