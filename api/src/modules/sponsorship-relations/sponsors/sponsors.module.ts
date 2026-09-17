import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sponsor, SponsorSchema } from './schemas/sponsor.schema.js';
import { SponsorsRepository } from './sponsors.repository.js';
import { SponsorsService } from './sponsors.service.js';
import { SponsorsController } from './sponsors.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Sponsor.name, schema: SponsorSchema }]), MediaAssetsModule],
  controllers: [SponsorsController],
  providers: [SponsorsRepository, SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
