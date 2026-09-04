import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import { MediaAssetsService } from './media-assets.service.js';
import { MediaAssetsController } from './media-assets.controller.js';
import { Album, AlbumSchema } from '../albums/schemas/album.schema.js';

/** Also registers the `Album` model (not just `MediaAsset`) so
 *  `MediaAssetsService` can maintain `Album.assetCount` without importing
 *  `AlbumsModule` — see the comment on `MediaAssetsService` for why that
 *  would be circular. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
      { name: Album.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsRepository, MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
