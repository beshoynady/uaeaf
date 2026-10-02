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

/**
 * `presidentMessagePage.federationAppointmentId` is validated only as a Mongo
 * id — nothing in its own schema ties it to a board position — so this is the
 * one place that stops a row pointed at some other appointment (a board
 * member's, a committee chair's) from being served at `/about/president`.
 * `FederationAppointmentsService.findActiveTopOfBoard()` (tested on its own
 * terms in federation-appointments.public.spec.ts) does the actual
 * rank/body derivation; these cases pin that `getCurrentPublic()` depends on
 * exactly that narrowed set and nothing wider.
 */
describe('PresidentMessagePagesService.getCurrentPublic — narrowed to the top of the board', () => {
  const make = (activeTopOfBoard: unknown[]) => {
    const repository = { find: mock() };
    const publications = { findLive: mock(), getPublicSnapshot: mock() };
    const appointmentsService = { findActiveTopOfBoard: jest.fn(async () => activeTopOfBoard) };
    const service = new PresidentMessagePagesService(
      repository as unknown as PresidentMessagePagesRepository,
      publications as unknown as PublicationsService,
      {} as unknown as RevisionsService,
      {} as unknown as MediaAssetsService,
      appointmentsService as unknown as FederationAppointmentsService,
    );
    return { service, repository, publications };
  };

  // The regression this closes: a message row pointing at an Active
  // appointment that isn't on the board's top post — a board member's, or a
  // committee chair's — must resolve to nothing, not be served as the
  // president's. Simulated here as `findActiveTopOfBoard()` excluding it,
  // which is exactly what it does for a non-top-ranked or committee position.
  it('returns null, and never even queries this collection, when no appointment is on the top-of-board post', async () => {
    const { service, repository } = make([]);

    const result = await service.getCurrentPublic();

    expect(result).toBeNull();
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('queries only records pointing at the top-of-board appointments, never a wider set', async () => {
    const topAppointmentId = new Types.ObjectId();
    const { service, repository, publications } = make([{ _id: topAppointmentId }]);
    repository.find.mockResolvedValue([]);

    await service.getCurrentPublic();

    expect(repository.find).toHaveBeenCalledWith({
      federationAppointmentId: { $in: [topAppointmentId] },
    });
    // A board member's or committee chair's appointment id is, by
    // construction, never in that $in list — so a row pointing at one is
    // unreachable through this query, never merely unpublished.
    expect(publications.findLive).not.toHaveBeenCalled();
  });
});
