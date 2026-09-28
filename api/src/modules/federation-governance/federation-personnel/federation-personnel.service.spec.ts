import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationPersonnelsService } from './federation-personnel.service.js';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/**
 * Fix round 1 (CLAUDE.md §31): `create()`'s `photoId` check
 * (`mediaAssetsService.assertUsableImage`) is re-run on `update()` when the
 * field is sent to a real value, mirroring `HeroSlidesService`'s
 * established convention for image references. Before this round,
 * `update()` never called `mediaAssetsService` at all — a patch could set
 * `photoId` to an archived or non-image asset with nothing to refuse it.
 */
describe('FederationPersonnelsService.update', () => {
  const id = new Types.ObjectId().toString();

  const makeRepository = () =>
    ({ updateById: jest.fn() }) as unknown as jest.Mocked<FederationPersonnelsRepository>;
  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  it('validates a changed photoId via MediaAssetsService.assertUsableImage before writing', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    mediaAssetsService.assertUsableImage.mockRejectedValue(new ConflictException());
    const service = new FederationPersonnelsService(repository, mediaAssetsService);
    const photoId = new Types.ObjectId().toString();

    await expect(service.update(id, { photoId } as never)).rejects.toThrow(ConflictException);
    expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(photoId);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('clears the photo with photoId: null without calling MediaAssetsService', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    repository.updateById.mockResolvedValue({ photoId: null } as never);
    const service = new FederationPersonnelsService(repository, mediaAssetsService);

    await service.update(id, { photoId: null } as never);

    expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.updateById).toHaveBeenCalledWith(id, { photoId: null });
  });

  it('writes a patch that does not touch photoId without calling MediaAssetsService', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    repository.updateById.mockResolvedValue({ status: 'Inactive' } as never);
    const service = new FederationPersonnelsService(repository, mediaAssetsService);

    await service.update(id, { status: 'Inactive' } as never);

    expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.updateById).toHaveBeenCalledWith(id, { status: 'Inactive' });
  });
});
