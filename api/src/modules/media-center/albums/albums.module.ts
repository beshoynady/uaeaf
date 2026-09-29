import { Module } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Album, AlbumSchema } from './schemas/album.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import {
  AlbumsService,
  ALBUM_PHOTO_REFERRER_SCAN,
  type AlbumPhotoReferrerScan,
} from './albums.service.js';
import { AlbumsController } from './albums.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';
import { findMediaAssetReferrers } from '../../../common/authz/media-references.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }]), MediaAssetsModule],
  controllers: [AlbumsController],
  providers: [
    AlbumsRepository,
    AlbumsService,
    {
      // Live references only, with the album leaving the photo excluded —
      // otherwise an asset used nowhere else could never be archived.
      provide: ALBUM_PHOTO_REFERRER_SCAN,
      inject: [getConnectionToken()],
      useFactory:
        (connection: Connection): AlbumPhotoReferrerScan =>
        (photoId, ignore) =>
          findMediaAssetReferrers(connection, photoId, { includeRevisions: false, ignore }),
    },
  ],
  // `AlbumsRepository` is also exported: `SeasonsService`'s delete guard
  // counts albums by `eventDate` range directly — an album has no
  // `seasonId` to join on, so it reads the repository, not a new service
  // method built only for this one check.
  exports: [AlbumsService, AlbumsRepository],
})
export class AlbumsModule {}
