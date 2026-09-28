import { Module } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import {
  MediaAssetsService,
  MEDIA_ASSET_LIVE_REFERRER_SCAN,
  type MediaAssetLiveReferrerScan,
} from './media-assets.service.js';
import {
  MediaAssetPurgeService,
  MEDIA_ASSET_REFERRER_SCAN,
  type MediaAssetReferrerScan,
} from './media-asset-purge.service.js';
import {
  UnusedMediaService,
  MEDIA_ASSET_BATCH_REFERRER_SCAN,
  type MediaAssetBatchReferrerScan,
} from './unused-media.service.js';
import { MediaAssetsController } from './media-assets.controller.js';
import { Album, AlbumSchema } from '../albums/schemas/album.schema.js';
import { StorageModule } from '../storage/storage.module.js';
import { AuditLogsModule } from '../../workflow/audit-logs/audit-logs.module.js';
import { StepUpModule } from '../../../common/authz/step-up.module.js';
import { findMediaAssetReferrers, findReferencedMediaAssetIds } from '../../../common/authz/media-references.js';

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
    StorageModule,
    AuditLogsModule,
    StepUpModule,
  ],
  controllers: [MediaAssetsController],
  providers: [
    MediaAssetsRepository,
    MediaAssetsService,
    {
      // The scan is bound to the connection here and takes nothing else, so
      // `ignore` — which suppresses referrers — has no route by which a request
      // could reach it.
      provide: MEDIA_ASSET_REFERRER_SCAN,
      inject: [getConnectionToken()],
      useFactory:
        (connection: Connection): MediaAssetReferrerScan =>
        (id: string) =>
          findMediaAssetReferrers(connection, id),
    },
    {
      // The batch sibling, for the unused-media report: one call for the
      // whole candidate page rather than one per candidate.
      provide: MEDIA_ASSET_BATCH_REFERRER_SCAN,
      inject: [getConnectionToken()],
      useFactory:
        (connection: Connection): MediaAssetBatchReferrerScan =>
        (ids: readonly string[]) =>
          findReferencedMediaAssetIds(connection, ids),
    },
    {
      // The archive warning's scan: live references only, decided by the
      // caller (`MediaAssetsService.remove`) rather than baked in here, so
      // the choice stays visible at the call site instead of hidden in this
      // factory.
      provide: MEDIA_ASSET_LIVE_REFERRER_SCAN,
      inject: [getConnectionToken()],
      useFactory:
        (connection: Connection): MediaAssetLiveReferrerScan =>
        (id: string, options?: { includeRevisions?: boolean }) =>
          findMediaAssetReferrers(connection, id, options),
    },
    MediaAssetPurgeService,
    UnusedMediaService,
  ],
  exports: [MediaAssetsService, MediaAssetPurgeService],
})
export class MediaAssetsModule {}
