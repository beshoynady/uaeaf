import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sponsorship, SponsorshipSchema } from './schemas/sponsorship.schema.js';
import { SponsorshipsRepository } from './sponsorships.repository.js';
import { SponsorshipsService } from './sponsorships.service.js';
import { SponsorshipsController } from './sponsorships.controller.js';
import { SponsorsModule } from '../sponsors/sponsors.module.js';
import { FederationsModule } from '../../federation-governance/federation/federation.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sponsorship.name, schema: SponsorshipSchema }]),
    SponsorsModule,
    FederationsModule,
  ],
  controllers: [SponsorshipsController],
  providers: [SponsorshipsRepository, SponsorshipsService],
  exports: [SponsorshipsService],
})
export class SponsorshipsModule {}
