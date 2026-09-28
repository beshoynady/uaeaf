import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationsService } from './federation.service.js';
import { FederationsRepository } from './federation.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/**
 * Fix round 1 (CLAUDE.md §31): `create()`'s `logoId` check
 * (`mediaAssetsService.assertUsableImage`) is re-run on `update()` when the
 * field is sent, mirroring `HeroSlidesService`'s established convention for
 * image references. Before this round, `update()` never called
 * `mediaAssetsService` at all — a patch could set `logoId` to an archived
 * or non-image asset with nothing to refuse it.
 */
describe('FederationsService.update', () => {
  const id = new Types.ObjectId().toString();

  const makeRepository = () => ({ updateById: jest.fn() }) as unknown as jest.Mocked<FederationsRepository>;
  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  it('validates a changed logoId via MediaAssetsService.assertUsableImage before writing', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    mediaAssetsService.assertUsableImage.mockRejectedValue(new NotFoundException());
    const service = new FederationsService(repository, mediaAssetsService);
    const logoId = new Types.ObjectId().toString();

    await expect(service.update(id, { logoId } as never)).rejects.toThrow(NotFoundException);
    expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(logoId);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('writes a patch that does not touch logoId without calling MediaAssetsService', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    repository.updateById.mockResolvedValue({ status: 'Inactive' } as never);
    const service = new FederationsService(repository, mediaAssetsService);

    await service.update(id, { status: 'Inactive' } as never);

    expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.updateById).toHaveBeenCalledWith(id, { status: 'Inactive' });
  });
});
