import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoachesRepository } from './coaches.repository.js';
import type { CoachDocument } from './schemas/coach.schema.js';
import { CreateCoachDto } from './dto/create-coach.dto.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../../common/utils/mongo-errors.util.js';

/** Implements: coaches collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6144`). Plain CRUD. */
@Injectable()
export class CoachesService {
  constructor(private readonly repository: CoachesRepository) {}

  /** @throws ConflictException when `dto.slug` or `dto.registrationNumber`
   *  is already taken — `registrationNumber` uniqueness added
   *  schema-audit-2026-09-04.md §3.3/§9.5 (P1). */
  async create(dto: CreateCoachDto): Promise<CoachDocument> {
    try {
      return await this.repository.create({
        fullName: dto.fullName,
        slug: dto.slug,
        photoId: dto.photoId ? new Types.ObjectId(dto.photoId) : null,
        licenseLevel: dto.licenseLevel,
        registrationNumber: dto.registrationNumber,
        clubId: dto.clubId ? new Types.ObjectId(dto.clubId) : null,
        disciplineIds: (dto.disciplineIds ?? []).map((id) => new Types.ObjectId(id)),
        nationalityId: new Types.ObjectId(dto.nationalityId),
        bio: dto.bio ?? null,
        gender: dto.gender,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'field'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<CoachDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<CoachDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<CoachDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
