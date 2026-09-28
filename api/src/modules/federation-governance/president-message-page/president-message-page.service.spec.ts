import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PresidentMessagePagesService } from './president-message-page.service.js';
import type { PresidentMessagePagesRepository } from './president-message-page.repository.js';
import type { PublicationsService } from '../../workflow/publications/publications.service.js';
import type { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import type { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';

const mock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

/**
 * The save's own suggestion, for the one governance page whose `update()` had
 * no spec at all before this: a swapped hero or featured image is offered for
 * archiving through the same mechanism `ArticlesService` uses.
 */
describe('PresidentMessagePagesService — orphaned media candidates', () => {
  const make = () => {
    const repository = { findById: mock(), updateById: mock() };
    const media = { assertUsableImage: mock(), orphanedMediaCandidates: mock().mockResolvedValue([]) };
    const service = new PresidentMessagePagesService(
      repository as unknown as PresidentMessagePagesRepository,
      {} as unknown as PublicationsService,
      {} as unknown as RevisionsService,
      media as unknown as MediaAssetsService,
      {} as unknown as FederationAppointmentsService,
    );
    return { service, repository, media };
  };

  it('asks about a hero image a save just replaced, and carries the answer back', async () => {
    const { service, repository, media } = make();
    const oldImageId = new Types.ObjectId();
    const newImageId = new Types.ObjectId();
    repository.findById.mockResolvedValue({ heroImageId: oldImageId });
    repository.updateById.mockResolvedValue({ heroImageId: newImageId });
    media.orphanedMediaCandidates.mockResolvedValue([oldImageId.toString()]);

    const saved = await service.update(
      new Types.ObjectId().toString(),
      { heroImageId: newImageId.toString() } as never,
      new Types.ObjectId(),
    );

    expect(media.orphanedMediaCandidates).toHaveBeenCalledWith([oldImageId.toString()]);
    expect(saved.orphanedMediaCandidates).toEqual([oldImageId.toString()]);
  });

  it('asks about nothing when no image field changed', async () => {
    const { service, repository, media } = make();
    const imageId = new Types.ObjectId();
    repository.findById.mockResolvedValue({ heroImageId: imageId });
    repository.updateById.mockResolvedValue({ heroImageId: imageId });

    await service.update(
      new Types.ObjectId().toString(),
      { heroTitle: { ar: 'ع', en: 'Title' } } as never,
      new Types.ObjectId(),
    );

    expect(media.orphanedMediaCandidates).toHaveBeenCalledWith([]);
  });

  it('throws NotFound before touching the repository write when no row has that id', async () => {
    const { service, repository } = make();
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update(new Types.ObjectId().toString(), {} as never, new Types.ObjectId()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateById).not.toHaveBeenCalled();
  });
});
