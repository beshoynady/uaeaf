import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Country } from './schemas/country.schema.js';
import type { CountryDocument } from './schemas/country.schema.js';

/** Implements: countries collection, Domain 2 — People & Organizations. */
@Injectable()
export class CountriesRepository extends BaseRepository<CountryDocument> {
  constructor(@InjectModel(Country.name) model: Model<CountryDocument>) {
    super(model);
  }
}
