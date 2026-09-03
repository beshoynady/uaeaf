import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoachesRepository } from './coaches.repository.js';
import type { CoachDocument } from './schemas/coach.schema.js';
import { CreateCoachDto } from './dto/create-coach.dto.js';

/** Implements: coaches collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6144`). Plain CRUD. */
@Injectable()
export class CoachesService {
  constructor(private readonly repository: CoachesRepository) {}

  async create(dto: CreateCoachDto): Promise<CoachDocument> {
    return this.repository.create({
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
