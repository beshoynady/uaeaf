import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MediaAssetsController } from './media-assets.controller.js';
import type { MediaAssetsService } from './media-assets.service.js';
import type { UnusedMediaService } from './unused-media.service.js';
import { MediaAssetPurgeService } from './media-asset-purge.service.js';
import type { MediaAssetsRepository } from './media-assets.repository.js';
import type { StorageProvider } from '../storage/storage-provider.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { UnavailableStepUpVerifier } from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * The permanent-delete route refuses for want of step-up verification, which
 * this API does not have — proven through the route with the real service and
 * the real verifier behind it, because a refusal asserted against a mocked
 * service proves only that the mock was configured.
 */
describe('MediaAssetsController — the permanent delete route', () => {
  const actor = { userId: new Types.ObjectId().toString() } as AuthenticatedUser;
  const request = { ip: '10.0.0.1', headers: { 'user-agent': 'jest' } } as never;

  const build = () => {
    const repository = {
      findIncludingArchived: jest.fn(),
      hardDelete: jest.fn(),
    } as unknown as jest.Mocked<MediaAssetsRepository>;
    const storage = {
      destroy: jest.fn<StorageProvider['destroy']>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StorageProvider>;
    const auditLogs = {
      write: jest.fn<AuditLogsService['write']>().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<AuditLogsService>;
    const scan = jest.fn(async () => []);
    const purge = new MediaAssetPurgeService(
      repository,
      storage,
      scan,
      new UnavailableStepUpVerifier(),
      auditLogs,
    );
    return {
      repository,
      storage,
      auditLogs,
      scan,
      controller: new MediaAssetsController({} as MediaAssetsService, purge, {} as UnusedMediaService),
    };
  };

  it('refuses with the step-up code', async () => {
    const { controller } = build();

    await expect(controller.purge('abc', actor, request)).rejects.toMatchObject({
      response: { code: 'mfa_step_up_required' },
    });
  });

  it('reads nothing, scans nothing, destroys nothing and records nothing', async () => {
    const { controller, repository, storage, auditLogs, scan } = build();

    await expect(controller.purge('abc', actor, request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findIncludingArchived).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
    expect(storage.destroy).not.toHaveBeenCalled();
    expect(repository.hardDelete).not.toHaveBeenCalled();
    expect(auditLogs.write).not.toHaveBeenCalled();
  });
});
