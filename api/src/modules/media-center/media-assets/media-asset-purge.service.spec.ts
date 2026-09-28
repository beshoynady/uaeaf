import { jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { MediaAssetPurgeService } from './media-asset-purge.service.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { StorageProvider } from '../storage/storage-provider.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { MediaAssetReferrerScan } from './media-asset-purge.service.js';
import { MediaReferenceCheckFailedError } from '../../../common/authz/media-references.js';
import {
  UnavailableStepUpVerifier,
  type StepUpVerifier,
} from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

describe('MediaAssetPurgeService', () => {
  const actor = { userId: new Types.ObjectId().toString() } as AuthenticatedUser;

  const makeRepository = () =>
    ({
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    }) as unknown as jest.Mocked<MediaAssetsRepository>;

  const makeStorage = () =>
    ({
      destroy: jest.fn<StorageProvider['destroy']>().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<StorageProvider>;

  const makeAuditLogs = () =>
    ({
      write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never),
    }) as unknown as jest.Mocked<AuditLogsService>;

  const archived = () =>
    ({
      _id: new Types.ObjectId(),
      archivedAt: new Date('2026-02-01'),
      file: { storageKey: 'uaeaf/pages/hero-ab12', originalName: 'hero.png' },
    }) as unknown as MediaAssetDocument;

  /** A verifier that lets the call through, so the conditions BELOW step-up can
   *  be exercised. The production one refuses — see the first test below. */
  const passingStepUp = (): StepUpVerifier => ({ assertVerified: async () => undefined });

  const build = (overrides: {
    repository?: jest.Mocked<MediaAssetsRepository>;
    storage?: jest.Mocked<StorageProvider>;
    auditLogs?: jest.Mocked<AuditLogsService>;
    scan?: MediaAssetReferrerScan;
    stepUp?: StepUpVerifier;
  } = {}) => {
    const repository = overrides.repository ?? makeRepository();
    const storage = overrides.storage ?? makeStorage();
    const auditLogs = overrides.auditLogs ?? makeAuditLogs();
    const scan = overrides.scan ?? (async () => []);
    const stepUp = overrides.stepUp ?? passingStepUp();
    return {
      repository,
      storage,
      auditLogs,
      service: new MediaAssetPurgeService(repository, storage, scan, stepUp, auditLogs),
    };
  };

  /**
   * Condition 3, at the service entry rather than at the route.
   *
   * This service is exported, so a caller that does not go through a controller
   * would skip anything a controller checked — and the route guard cannot see
   * whether a refusal ran.
   */
  it('refuses without step-up verification, and reads nothing at all', async () => {
    const { service, repository, storage, auditLogs } = build({
      stepUp: new UnavailableStepUpVerifier(),
    });

    await expect(service.permanentDelete('abc', actor)).rejects.toMatchObject({
      response: { code: 'mfa_step_up_required' },
    });
    expect(repository.findIncludingArchived).not.toHaveBeenCalled();
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
    expect(auditLogs.write).not.toHaveBeenCalled();
  });

  it('refuses an id that references nothing', async () => {
    const { service, repository, storage } = build();
    repository.findIncludingArchived.mockResolvedValue(null);

    await expect(service.permanentDelete('abc', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.destroy).not.toHaveBeenCalled();
  });

  it('refuses an asset that has not been archived first', async () => {
    const { service, repository, storage } = build();
    repository.findIncludingArchived.mockResolvedValue({
      _id: new Types.ObjectId(),
      archivedAt: null,
      file: { storageKey: 'uaeaf/pages/live' },
    } as unknown as MediaAssetDocument);

    await expect(service.permanentDelete('abc', actor)).rejects.toMatchObject({
      response: { code: 'conflict' },
    });
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('refuses while anything still references it, naming the referrers and their kind', async () => {
    const referrers = [
      { collection: 'heroSlides', path: 'imageId', documentId: 'slide-1', kind: 'ref' as const },
      { collection: 'articles', path: 'body', documentId: 'article-1', kind: 'richTextLink' as const },
    ];
    const { service, repository, storage } = build({ scan: async () => referrers });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toMatchObject({
      response: { code: 'stillReferenced', referrers },
    });
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('refuses when the reference check cannot complete, naming what was unchecked', async () => {
    const { service, repository, storage } = build({
      scan: async () => {
        throw new MediaReferenceCheckFailedError(['venues']);
      },
    });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toMatchObject({
      response: { code: 'referenceCheckFailed', unchecked: ['venues'] },
    });
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  /** A failure the scan did not wrap — a `TypeError`, a driver throw from
   *  outside its own guards — must refuse exactly as loudly. Catching only the
   *  one class is how "the check failed" becomes "nothing references it". */
  it('refuses when the reference check throws something it does not own', async () => {
    const { service, repository, storage } = build({
      scan: async () => {
        throw new TypeError('not an id');
      },
    });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('destroys the stored object before removing the row', async () => {
    const { service, repository, storage } = build();
    repository.findIncludingArchived.mockResolvedValue(archived());

    await service.permanentDelete('abc', actor);

    expect(storage.destroy).toHaveBeenCalledWith('uaeaf/pages/hero-ab12');
    expect(storage.destroy.mock.invocationCallOrder[0]).toBeLessThan(
      repository.hardDelete.mock.invocationCallOrder[0],
    );
  });

  it('keeps the row when the storage destroy fails', async () => {
    const storage = makeStorage();
    storage.destroy.mockRejectedValue(new ServiceUnavailableException('provider down'));
    const { service, repository } = build({ storage });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  it('writes one audit row naming the asset and the breadth of the reference check', async () => {
    const { service, repository, auditLogs } = build();
    const asset = archived();
    repository.findIncludingArchived.mockResolvedValue(asset);

    await service.permanentDelete('abc', actor, { ipAddress: '10.0.0.1', userAgent: 'jest' });

    expect(auditLogs.write).toHaveBeenCalledTimes(1);
    expect(auditLogs.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PermanentDelete',
        entityType: 'mediaAssets',
        entityId: asset._id,
        newValue: expect.objectContaining({
          storageKey: 'uaeaf/pages/hero-ab12',
          referencesChecked: expect.any(Number),
          referrersFound: 0,
        }),
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
      }),
    );
  });

  /**
   * Condition 4 is a condition, so it is met before the act it records.
   *
   * Written afterwards, a failing audit write leaves the object and the row gone,
   * no trace of either, and a 500 telling the caller nothing happened.
   */
  it('records the intent before destroying anything', async () => {
    const { service, repository, storage, auditLogs } = build();
    repository.findIncludingArchived.mockResolvedValue(archived());

    await service.permanentDelete('abc', actor);

    expect(auditLogs.write.mock.invocationCallOrder[0]).toBeLessThan(
      storage.destroy.mock.invocationCallOrder[0],
    );
  });

  it('destroys nothing when the audit row cannot be written', async () => {
    const auditLogs = makeAuditLogs();
    auditLogs.write.mockRejectedValue(new Error('audit down') as never);
    const { service, repository, storage } = build({ auditLogs });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toThrow('audit down');
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
  });

  /** Append-only: an outcome that differs from the intent is a second row, never
   *  an edit to the first. */
  it('appends a second row when the storage destroy fails', async () => {
    const storage = makeStorage();
    storage.destroy.mockRejectedValue(new ServiceUnavailableException('provider down'));
    const { service, repository, auditLogs } = build({ storage });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(auditLogs.write).toHaveBeenCalledTimes(2);
    expect(auditLogs.write.mock.calls[1][0].reason).toContain('Storage refused');
  });

  it('appends a second row when the row cannot be removed after the object is gone', async () => {
    const repository = makeRepository();
    repository.hardDelete.mockRejectedValue(new Error('driver down') as never);
    const { service, auditLogs } = build({ repository });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toThrow('driver down');
    expect(auditLogs.write).toHaveBeenCalledTimes(2);
    expect(auditLogs.write.mock.calls[1][0].reason).toContain('could not be removed');
  });

  it('writes no audit row when the deletion was refused before it began', async () => {
    const { service, repository, auditLogs } = build({
      scan: async () => [
        { collection: 'heroSlides', path: 'imageId', documentId: 'slide-1', kind: 'ref' as const },
      ],
    });
    repository.findIncludingArchived.mockResolvedValue(archived());

    await expect(service.permanentDelete('abc', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(auditLogs.write).not.toHaveBeenCalled();
  });
});
