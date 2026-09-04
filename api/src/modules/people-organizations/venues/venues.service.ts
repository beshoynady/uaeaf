import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { VenuesRepository } from './venues.repository.js';
import type { VenueDocument } from './schemas/venue.schema.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';

/** Implements: venues collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6372`). Plain CRUD. */
@Injectable()
export class VenuesService {
  constructor(private readonly repository: VenuesRepository) {}

  async create(dto: CreateVenueDto): Promise<VenueDocument> {
    return this.repository.create({
      name: dto.name,
      countryId: new Types.ObjectId(dto.countryId),
      ownerClubId: dto.ownerClubId ? new Types.ObjectId(dto.ownerClubId) : null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
  }

  async findAll(): Promise<VenueDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<VenueDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VenueDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
