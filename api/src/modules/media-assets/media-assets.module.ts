import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import { MediaAssetsService } from './media-assets.service.js';
import { MediaAssetsController } from './media-assets.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: MediaAsset.name, schema: MediaAssetSchema }])],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsRepository, MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
