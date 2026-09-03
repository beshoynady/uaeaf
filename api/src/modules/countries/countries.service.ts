import { Injectable } from '@nestjs/common';
import type { Types } from 'mongoose';
import { CountriesRepository } from './countries.repository.js';
import type { CountryDocument } from './schemas/country.schema.js';
import { CreateCountryDto } from './dto/create-country.dto.js';

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

  async remove(id: string, archivedBy: Types.ObjectId): Promise<CountryDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
