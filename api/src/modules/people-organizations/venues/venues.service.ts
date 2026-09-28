import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VenuesRepository } from './venues.repository.js';
import type { VenueDocument } from './schemas/venue.schema.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

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

  /** `countryId` is `required: true` in the schema; `ownerClubId` defaults
   *  to `null` (Fix round 2 — read from `venue.schema.ts`).
   *  @throws NotFoundException when no such venue exists. */
  async update(id: string, dto: UpdateVenueDto): Promise<VenueDocument> {
    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'countryId', { nullable: false });
    setObjectIdField(update, dto, 'ownerClubId', { nullable: true });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Venue ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VenueDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<VenueDocument | null> {
    return this.repository.restore(id);
  }
}
