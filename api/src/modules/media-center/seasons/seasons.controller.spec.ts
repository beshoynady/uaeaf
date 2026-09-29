import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { SeasonsController } from './seasons.controller.js';
import { SeasonsService } from './seasons.service.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * `PATCH /seasons/:id/publish` used to call `SeasonsService.publish()`
 * directly — a second door into `Published` that never consulted any
 * policy (ADR-0125). This pins the one door that replaced it: the route
 * still exists, under the same `Publish` guard, but the record now moves
 * through `PublishingService`, same as every other publication entity type.
 */
describe('SeasonsController.publish', () => {
  const seasonId = new Types.ObjectId().toString();
  const expectedUpdatedAt = '2026-09-01T00:00:00.000Z';
  const actor = {
    userId: new Types.ObjectId().toString(),
    permissions: [{ resourceType: 'seasons', action: 'Publish' }],
  } as unknown as AuthenticatedUser;

  it('delegates to PublishingService.publishDirect with entityType "seasons"', async () => {
    const publishingService = {
      publishDirect: jest.fn(async () => ({
        revisionId: 'r1',
        publicationId: 'p1',
        publishedAt: '2026-09-29T00:00:00.000Z',
      })),
    } as unknown as jest.Mocked<PublishingService>;
    const service = {} as unknown as SeasonsService;
    const controller = new SeasonsController(service, publishingService);
    const req = { ip: '10.0.0.1', headers: { 'user-agent': 'jest' } } as never;

    await controller.publish(seasonId, { expectedUpdatedAt }, actor, req);

    expect(publishingService.publishDirect).toHaveBeenCalledWith({
      entityType: 'seasons',
      entityId: new Types.ObjectId(seasonId),
      actor,
      expectedUpdatedAt: new Date(expectedUpdatedAt),
      context: { ipAddress: '10.0.0.1', userAgent: 'jest' },
    });
  });

  it('no longer calls SeasonsService to publish', async () => {
    const publishingService = { publishDirect: jest.fn(async () => ({}) as never) } as unknown as jest.Mocked<PublishingService>;
    const service = {} as unknown as SeasonsService;
    const controller = new SeasonsController(service, publishingService);
    const req = { ip: '', headers: {} } as never;

    await controller.publish(seasonId, { expectedUpdatedAt }, actor, req);

    expect('publish' in service).toBe(false);
  });
});

/**
 * The route the publish gate needs to have somewhere to send an author.
 * Without it, a season under an approval policy has no path into `Published`
 * at all: `publish` refuses with `workflowRequired`, and nothing opens the
 * review it names.
 */
describe('SeasonsController.submit', () => {
  const seasonId = new Types.ObjectId().toString();
  const actor = {
    userId: new Types.ObjectId().toString(),
    permissions: [{ resourceType: 'seasons', action: 'Update' }],
  } as unknown as AuthenticatedUser;

  it('opens the review through PublishingService with entityType "seasons"', async () => {
    const publishingService = {
      submit: jest.fn(async () => ({ workflowInstanceId: 'w1', revisionId: 'r1' })),
    } as unknown as jest.Mocked<PublishingService>;
    const controller = new SeasonsController({} as unknown as SeasonsService, publishingService);
    const req = { ip: '10.0.0.1', headers: { 'user-agent': 'jest' } } as never;

    await controller.submit(seasonId, actor, req);

    expect(publishingService.submit).toHaveBeenCalledWith({
      entityType: 'seasons',
      entityId: new Types.ObjectId(seasonId),
      actor,
      context: { ipAddress: '10.0.0.1', userAgent: 'jest' },
    });
  });

  it('names no workflow definition of its own — the policy decides', async () => {
    const publishingService = {
      submit: jest.fn(async () => ({ workflowInstanceId: 'w1', revisionId: 'r1' })),
    } as unknown as jest.Mocked<PublishingService>;
    const controller = new SeasonsController({} as unknown as SeasonsService, publishingService);

    await controller.submit(seasonId, actor, { ip: '', headers: {} } as never);

    const [sent] = (publishingService.submit as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(sent).sort()).toEqual(['actor', 'context', 'entityId', 'entityType']);
  });
});
