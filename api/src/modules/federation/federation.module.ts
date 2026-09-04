import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Federation, FederationSchema } from './schemas/federation.schema.js';
import { FederationsRepository } from './federation.repository.js';
import { FederationsService } from './federation.service.js';
import { FederationsController } from './federation.controller.js';
import { MediaAssetsModule } from '../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Federation.name, schema: FederationSchema }]),
    MediaAssetsModule,
  ],
  controllers: [FederationsController],
  providers: [FederationsRepository, FederationsService],
  exports: [FederationsService],
})
export class FederationsModule {}
