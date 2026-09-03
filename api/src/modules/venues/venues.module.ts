import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Venue, VenueSchema } from './schemas/venue.schema.js';
import { VenuesRepository } from './venues.repository.js';
import { VenuesService } from './venues.service.js';
import { VenuesController } from './venues.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Venue.name, schema: VenueSchema }])],
  controllers: [VenuesController],
  providers: [VenuesRepository, VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
