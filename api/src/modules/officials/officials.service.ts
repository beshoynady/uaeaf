import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialsRepository } from './officials.repository.js';
import type { OfficialDocument } from './schemas/official.schema.js';
import { CreateOfficialDto } from './dto/create-official.dto.js';
import { OfficialPublicResponseDto } from './dto/official-public-response.dto.js';

/** Implements: officials collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6182`). Plain CRUD — the Local/Guest profile-linkage
 *  rule lives in `OfficialProfilesService`, not here. */
@Injectable()
export class OfficialsService {
  constructor(private readonly repository: OfficialsRepository) {}

  async create(dto: CreateOfficialDto): Promise<OfficialDocument> {
    return this.repository.create({
      fullName: dto.fullName,
      roleType: dto.roleType,
      licenseLevel: dto.licenseLevel,
      disciplineIds: (dto.disciplineIds ?? []).map((id) => new Types.ObjectId(id)),
      nationalityId: new Types.ObjectId(dto.nationalityId),
      residencyType: dto.residencyType,
      federationName: dto.federationName ?? null,
    });
  }

  async findAll(): Promise<OfficialDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<OfficialDocument | null> {
    return this.repository.findById(id);
  }

  /** Mirrors `AthletesService.getDisciplineIds()` — see that method's
   *  doc comment. @throws NotFoundException when `officialId` doesn't exist. */
  async getDisciplineIds(officialId: string): Promise<Types.ObjectId[]> {
    const official = await this.findById(officialId);
    if (!official) {
      throw new NotFoundException(`Official ${officialId} not found.`);
    }
    return official.disciplineIds;
  }

  /** Every official in public-safe form — backs the public officials
   *  listing. */
  async findAllPublic(): Promise<OfficialPublicResponseDto[]> {
    const officials = await this.repository.find();
    return officials.map((official) => this.toPublicResponse(official));
  }

  /** Maps a full `Official` document to its public-safe shape. */
  toPublicResponse(official: OfficialDocument): OfficialPublicResponseDto {
    return {
      id: official._id.toString(),
      fullName: official.fullName,
      roleType: official.roleType,
      licenseLevel: official.licenseLevel,
      disciplineIds: official.disciplineIds.map((id) => id.toString()),
      nationalityId: official.nationalityId.toString(),
      residencyType: official.residencyType,
      federationName: official.federationName,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<OfficialDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
