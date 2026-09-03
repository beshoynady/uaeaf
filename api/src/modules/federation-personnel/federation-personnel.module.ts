import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FederationPersonnel, FederationPersonnelSchema } from './schemas/federation-personnel.schema.js';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import { FederationPersonnelsService } from './federation-personnel.service.js';
import { FederationPersonnelsController } from './federation-personnel.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FederationPersonnel.name, schema: FederationPersonnelSchema }]),
    MediaAssetsModule,
  ],
  controllers: [FederationPersonnelsController],
  providers: [FederationPersonnelsRepository, FederationPersonnelsService],
  exports: [FederationPersonnelsService],
})
export class FederationPersonnelsModule {}
