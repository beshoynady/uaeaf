import { Injectable, NotFoundException } from '@nestjs/common';
import type { Types } from 'mongoose';
import { CountriesRepository } from './countries.repository.js';
import type { CountryDocument } from './schemas/country.schema.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

/** Implements: countries collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6398`). Plain CRUD, reference data for the rest of
 *  Domain 2 (nationality, club/venue location). */
@Injectable()
export class CountriesService {
  constructor(private readonly repository: CountriesRepository) {}

  async create(dto: CreateCountryDto): Promise<CountryDocument> {
    return this.repository.create(dto);
  }

  async findAll(): Promise<CountryDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<CountryDocument | null> {
    return this.repository.findById(id);
  }

  /** @throws NotFoundException when no such country exists. */
  async update(id: string, dto: UpdateCountryDto): Promise<CountryDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Country ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<CountryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<CountryDocument | null> {
    return this.repository.restore(id);
  }
}
