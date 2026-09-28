import { Inject, Injectable } from '@nestjs/common';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { MediaAssetPurgeService } from './media-asset-purge.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import type { UnusedMediaReportDto, UnusedMediaRowDto } from './dto/unused-media-response.dto.js';

/** The batch reference scan, bound to a connection the same way
 *  `MediaAssetReferrerScan` is: injected rather than imported, so this
 *  service can be exercised without a database. */
export type MediaAssetBatchReferrerScan = (ids: readonly string[]) => Promise<Set<string>>;

/** Injection token for `MediaAssetBatchReferrerScan`. */
export const MEDIA_ASSET_BATCH_REFERRER_SCAN = Symbol('MEDIA_ASSET_BATCH_REFERRER_SCAN');

/** The one place the default window is written. Asserted at this single
 *  source of truth — never repeated beside a separately-asserted `Date`,
 *  which would let an implementation honour one and ignore the other. */
export const DEFAULT_UNUSED_WINDOW_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface UnusedMediaQuery {
  olderThanDays?: number;
  skip: number;
  limit: number;
}

/**
 * Which archived media files nothing uses any more, and how much space
 * purging them would recover — the report a Super Admin reads before
 * deciding on `mediaAssets:PermanentDelete`, which is why it is guarded by
 * that same permission.
 *
 * The report is a snapshot and can be minutes old. `purgeFromReport` never
 * trusts the row it was called from: it delegates to
 * `MediaAssetPurgeService.permanentDelete`, which re-runs the single-asset
 * reference check (and every other condition) at the moment of the delete.
 */
@Injectable()
export class UnusedMediaService {
  constructor(
    private readonly repository: MediaAssetsRepository,
    @Inject(MEDIA_ASSET_BATCH_REFERRER_SCAN) private readonly findReferenced: MediaAssetBatchReferrerScan,
    private readonly purgeService: MediaAssetPurgeService,
  ) {}

  async report(query: UnusedMediaQuery): Promise<UnusedMediaReportDto> {
    const days = query.olderThanDays ?? DEFAULT_UNUSED_WINDOW_DAYS;
    const cutoff = new Date(Date.now() - days * MS_PER_DAY);

    const candidates = await this.repository.findArchivedOlderThan(cutoff);
    if (candidates.length === 0) {
      return { items: [], total: 0, totalSize: 0 };
    }

    const referenced = await this.findReferenced(candidates.map((asset) => asset._id.toString()));
    // Largest first, so the biggest saving is on the first page.
    const unused = candidates
      .filter((asset) => !referenced.has(asset._id.toString()))
      .sort((a, b) => b.file.size - a.file.size);

    const total = unused.length;
    const totalSize = unused.reduce((sum, asset) => sum + asset.file.size, 0);
    const page = unused.slice(query.skip, query.skip + query.limit);

    return { items: page.map((asset) => this.toRow(asset)), total, totalSize };
  }

  /** The row's only action. Takes no referrer list from the report — the
   *  service it delegates to reads the asset fresh and re-runs the reference
   *  check itself, so a reference added after the report was generated still
   *  refuses the delete. */
  purgeFromReport = (
    id: string,
    actor: AuthenticatedUser,
    context: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> => this.purgeService.permanentDelete(id, actor, context);

  /** `archivedBy` is the raw actor id, not a resolved name: joining it to a
   *  display name would need `UsersModule`, and `UsersModule` already reaches
   *  this module through `FederationPersonnelsModule` — importing it back
   *  here would be circular. `GET /users/names` is the existing batch
   *  resolver built for exactly this: a caller with a list of user ids and no
   *  reason to hold `users:Read`. */
  private toRow(asset: MediaAssetDocument): UnusedMediaRowDto {
    return {
      id: asset._id.toString(),
      originalName: asset.file.originalName,
      type: asset.file.mimeType,
      size: asset.file.size,
      archivedAt: asset.archivedAt as Date,
      archivedBy: asset.archivedBy ? String(asset.archivedBy) : null,
      thumbnailUrl: asset.file.url,
    };
  }
}
