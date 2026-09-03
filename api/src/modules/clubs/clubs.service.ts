import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClubsRepository } from './clubs.repository.js';
import type { ClubDocument } from './schemas/club.schema.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** Implements: clubs collection, Domain 2 — People & Organizations (FigJam
 *  node `80:5970`). Plain CRUD. */
@Injectable()
export class ClubsService {
  constructor(private readonly repository: ClubsRepository) {}

  /** @throws ConflictException when `dto.slug` or `dto.registrationNumber`
   *  is already taken — `registrationNumber` uniqueness added
   *  schema-audit-2026-09-04.md §3.3/§9.5 (P1). */
  async create(dto: CreateClubDto): Promise<ClubDocument> {
    try {
      return await this.repository.create({
        name: dto.name,
        slug: dto.slug,
        logoId: dto.logoId ? new Types.ObjectId(dto.logoId) : null,
        foundingDate: new Date(dto.foundingDate),
        emirateId: new Types.ObjectId(dto.emirateId),
        registrationNumber: dto.registrationNumber,
        clubType: dto.clubType,
        coverImage: dto.coverImage ? new Types.ObjectId(dto.coverImage) : null,
        description: dto.description ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        website: dto.website ?? null,
        socialLinks: dto.socialLinks ?? [],
        venueId: dto.venueId ? new Types.ObjectId(dto.venueId) : null,
        status: dto.status,
        introVideoId: dto.introVideoId ? new Types.ObjectId(dto.introVideoId) : null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'field'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<ClubDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<ClubDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<ClubDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
