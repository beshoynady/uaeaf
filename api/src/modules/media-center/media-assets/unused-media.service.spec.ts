import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DEFAULT_UNUSED_WINDOW_DAYS, UnusedMediaService } from './unused-media.service.js';
import type { MediaAssetBatchReferrerScan } from './unused-media.service.js';
import { MediaAssetPurgeService } from './media-asset-purge.service.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { StorageProvider } from '../storage/storage-provider.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { MediaAssetReferrerScan } from './media-asset-purge.service.js';
import type { StepUpVerifier } from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

describe('UnusedMediaService.report', () => {
  const actor = { userId: new Types.ObjectId().toString() } as AuthenticatedUser;

  const asset = (overrides: {
    id?: Types.ObjectId;
    size: number;
    archivedBy?: Types.ObjectId | null;
    archivedAt?: Date;
    mimeType?: string;
    originalName?: string;
    url?: string;
  }): MediaAssetDocument =>
    ({
      _id: overrides.id ?? new Types.ObjectId(),
      archivedAt: overrides.archivedAt ?? new Date('2026-01-01'),
      archivedBy: overrides.archivedBy ?? new Types.ObjectId(),
      file: {
        size: overrides.size,
        mimeType: overrides.mimeType ?? 'image/png',
        originalName: overrides.originalName ?? 'photo.png',
        url: overrides.url ?? 'https://res.cloudinary.com/demo/upload/v1/uaeaf/media/photo.png',
      },
    }) as unknown as MediaAssetDocument;

  const makeRepository = () =>
    ({
      findArchivedOlderThan: jest.fn<MediaAssetsRepository['findArchivedOlderThan']>(),
    }) as unknown as jest.Mocked<MediaAssetsRepository>;

  /** A single-asset scan the purge service reads at the delete — never at the
   *  report. Kept as its own mock so a test can change its answer between the
   *  report call and the delete call. */
  const makeReferrers = () => jest.fn<MediaAssetReferrerScan>().mockResolvedValue([]);

  const passingStepUp = (): StepUpVerifier => ({ assertVerified: async () => undefined });

  const build = (overrides: {
    repository?: jest.Mocked<MediaAssetsRepository>;
    batchScan?: MediaAssetBatchReferrerScan;
    referrers?: ReturnType<typeof makeReferrers>;
  } = {}) => {
    const repository = overrides.repository ?? makeRepository();
    const batchScan = overrides.batchScan ?? (async () => new Set<string>());
    const referrers = overrides.referrers ?? makeReferrers();

    const purgeRepository = {
      findIncludingArchived: jest.fn<MediaAssetsRepository['findIncludingArchived']>(),
      hardDelete: jest.fn<MediaAssetsRepository['hardDelete']>().mockResolvedValue(true),
    } as unknown as jest.Mocked<MediaAssetsRepository>;
    const storage = { destroy: jest.fn<StorageProvider['destroy']>().mockResolvedValue(undefined) } as unknown as jest.Mocked<StorageProvider>;
    const auditLogs = { write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never) } as unknown as jest.Mocked<AuditLogsService>;

    const purgeService = new MediaAssetPurgeService(
      purgeRepository,
      storage,
      referrers,
      passingStepUp(),
      auditLogs,
    );

    return {
      repository,
      purgeRepository,
      referrers,
      service: new UnusedMediaService(repository, batchScan, purgeService),
    };
  };

  it('lists only archived assets with no referrer, older than the window', async () => {
    const referencedId = new Types.ObjectId();
    const unusedId = new Types.ObjectId();
    const { repository, service } = build({
      batchScan: async () => new Set([referencedId.toString()]),
    });
    // The "too recent" candidate never reaches the service at all: the
    // repository query itself is what excludes it by `archivedAt`.
    repository.findArchivedOlderThan.mockResolvedValue([
      asset({ id: referencedId, size: 100 }),
      asset({ id: unusedId, size: 200 }),
    ]);

    const report = await service.report({ skip: 0, limit: 20 });

    expect(report.items.map((item) => item.id)).toEqual([unusedId.toString()]);
  });

  it('carries what the row needs: name, type, size, when it was archived and by whom', async () => {
    const archivedBy = new Types.ObjectId();
    const archivedAt = new Date('2026-02-03');
    const { repository, service } = build();
    repository.findArchivedOlderThan.mockResolvedValue([
      asset({
        size: 321,
        archivedBy,
        archivedAt,
        mimeType: 'image/webp',
        originalName: 'crowd.webp',
        url: 'https://res.cloudinary.com/demo/upload/v1/uaeaf/media/crowd.webp',
      }),
    ]);

    const [row] = (await service.report({ skip: 0, limit: 20 })).items;

    expect(Object.keys(row).sort()).toEqual(
      ['archivedAt', 'archivedBy', 'id', 'originalName', 'size', 'thumbnailUrl', 'type'].sort(),
    );
    expect(row.type).toBe('image/webp');
    expect(row.size).toBe(321);
    expect(row.originalName).toBe('crowd.webp');
    expect(row.archivedBy).toBe(archivedBy.toString());
    expect(row.thumbnailUrl).toBe('https://res.cloudinary.com/demo/upload/v1/uaeaf/media/crowd.webp');
  });

  it('totals the count and the space recoverable across the whole set, not the page', async () => {
    const { repository, service } = build();
    repository.findArchivedOlderThan.mockResolvedValue([
      asset({ size: 100 }),
      asset({ size: 200 }),
      asset({ size: 300 }),
    ]);

    const report = await service.report({ skip: 0, limit: 1 });

    expect(report.items).toHaveLength(1);
    expect(report.total).toBe(3);
    expect(report.totalSize).toBe(600);
  });

  it('orders largest first, so the biggest saving is on the first page', async () => {
    const { repository, service } = build();
    repository.findArchivedOlderThan.mockResolvedValue([
      asset({ size: 50 }),
      asset({ size: 900 }),
      asset({ size: 400 }),
    ]);

    const sizes = (await service.report({ skip: 0, limit: 20 })).items.map((item) => item.size);

    expect(sizes).toEqual([900, 400, 50]);
  });

  /**
   * Asserted at one source of truth: the actual `Date` handed to the
   * repository, not a separately-asserted `{ days: 90 }` beside
   * `expect.any(Date)` — which proves nothing about which number was used.
   */
  it('defaults the window to 90 days', async () => {
    expect(DEFAULT_UNUSED_WINDOW_DAYS).toBe(90);

    const before = Date.now();
    const { repository, service } = build();
    repository.findArchivedOlderThan.mockResolvedValue([]);

    await service.report({ skip: 0, limit: 20 });
    const after = Date.now();

    expect(repository.findArchivedOlderThan).toHaveBeenCalledTimes(1);
    const cutoff = repository.findArchivedOlderThan.mock.calls[0][0] as Date;
    const expectedEarliest = before - 90 * 24 * 60 * 60 * 1000;
    const expectedLatest = after - 90 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedEarliest);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedLatest);
  });

  it('honours an explicit window over the default', async () => {
    const { repository, service } = build();
    repository.findArchivedOlderThan.mockResolvedValue([]);

    await service.report({ olderThanDays: 30, skip: 0, limit: 20 });

    const cutoff = repository.findArchivedOlderThan.mock.calls[0][0] as Date;
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5000);
  });

  it('queries nothing else and answers an empty report when nothing is archived past the window', async () => {
    const batchScan = jest.fn<MediaAssetBatchReferrerScan>().mockResolvedValue(new Set());
    const { repository, service } = build({ batchScan });
    repository.findArchivedOlderThan.mockResolvedValue([]);

    const report = await service.report({ skip: 0, limit: 20 });

    expect(report).toEqual({ items: [], total: 0, totalSize: 0 });
    expect(batchScan).not.toHaveBeenCalled();
  });

  /**
   * The report is a snapshot and can be minutes old. An editor may have pasted
   * the file's URL into an article since. So the delete re-runs the full
   * single-asset check rather than trusting the row it was clicked from.
   */
  it('re-checks references at the delete, not at the report', async () => {
    const referrers = makeReferrers();
    const { repository, service, purgeRepository } = build({ referrers });
    const unusedId = new Types.ObjectId();
    repository.findArchivedOlderThan.mockResolvedValue([asset({ id: unusedId, size: 10 })]);
    purgeRepository.findIncludingArchived.mockResolvedValue(
      asset({ id: unusedId, size: 10, archivedAt: new Date('2026-01-01') }),
    );

    // The report itself never calls the single-asset scan.
    const report = await service.report({ skip: 0, limit: 20 });
    expect(report.items.map((item) => item.id)).toEqual([unusedId.toString()]);
    expect(referrers).not.toHaveBeenCalled();

    // A reference appears after the report was taken.
    referrers.mockResolvedValue([{ collection: 'articles', path: 'body', documentId: 'a1', kind: 'richTextLink' }]);

    await expect(service.purgeFromReport(unusedId.toString(), actor)).rejects.toMatchObject({
      response: { code: 'stillReferenced' },
    });
  });

  it('purgeFromReport delegates to the purge service and its own conditions still apply', async () => {
    const { repository, service, purgeRepository } = build();
    const liveId = new Types.ObjectId();
    repository.findArchivedOlderThan.mockResolvedValue([]);
    purgeRepository.findIncludingArchived.mockResolvedValue({
      _id: liveId,
      archivedAt: null,
      file: { storageKey: 'uaeaf/pages/live' },
    } as unknown as MediaAssetDocument);

    await expect(service.purgeFromReport(liveId.toString(), actor)).rejects.toBeInstanceOf(ConflictException);
  });
});
