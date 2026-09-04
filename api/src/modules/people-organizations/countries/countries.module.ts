import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Country, CountrySchema } from './schemas/country.schema.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';
import { CountriesController } from './countries.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }])],
  controllers: [CountriesController],
  providers: [CountriesRepository, CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
