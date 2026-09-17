import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Partnership, PartnershipSchema } from './schemas/partnership.schema.js';
import { PartnershipsRepository } from './partnerships.repository.js';
import { PartnershipsService } from './partnerships.service.js';
import { PartnershipsController } from './partnerships.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Partnership.name, schema: PartnershipSchema }]), MediaAssetsModule],
  controllers: [PartnershipsController],
  providers: [PartnershipsRepository, PartnershipsService],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
