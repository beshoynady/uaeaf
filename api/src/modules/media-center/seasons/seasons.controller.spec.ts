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

/**
 * The half of the approval loop that was missing: a review can be approved,
 * and then nothing puts the season live. `publishApproved` is a separate act
 * from approving, on a separate grant.
 */
describe('SeasonsController.publishApproved', () => {
  const seasonId = new Types.ObjectId().toString();
  const actor = {
    userId: new Types.ObjectId().toString(),
    permissions: [{ resourceType: 'seasons', action: 'Publish' }],
  } as unknown as AuthenticatedUser;

  it('publishes the approved revision through PublishingService', async () => {
    const publishingService = {
      publishApproved: jest.fn(async () => ({ revisionId: 'r1', publicationId: 'p1' })),
    } as unknown as jest.Mocked<PublishingService>;
    const controller = new SeasonsController({} as unknown as SeasonsService, publishingService);

    await controller.publishApproved(seasonId, actor, {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as never);

    expect(publishingService.publishApproved).toHaveBeenCalledWith({
      entityType: 'seasons',
      entityId: new Types.ObjectId(seasonId),
      actor,
      context: { ipAddress: '10.0.0.1', userAgent: 'jest' },
    });
  });
});

describe('SeasonsController.editorialState', () => {
  it('reads the state from PublishingService for this caller', async () => {
    const actor = { userId: new Types.ObjectId().toString() } as unknown as AuthenticatedUser;
    const seasonId = new Types.ObjectId().toString();
    const publishingService = {
      editorialState: jest.fn(async () => ({ publicationState: 'Draft' })),
    } as unknown as jest.Mocked<PublishingService>;
    const controller = new SeasonsController({} as unknown as SeasonsService, publishingService);

    await controller.editorialState(seasonId, actor);

    expect(publishingService.editorialState).toHaveBeenCalledWith(
      'seasons',
      new Types.ObjectId(seasonId),
      actor,
    );
  });
});

/**
 * While a review is running the draft belongs to it. Without this the
 * approver's decision would attach to content edited after they read it.
 */
describe('SeasonsController.update under review', () => {
  const seasonId = new Types.ObjectId().toString();
  const actor = { userId: new Types.ObjectId().toString() } as unknown as AuthenticatedUser;
  const dto = { shortName: 'edited' } as never;

  it('asks whether this caller may edit before saving anything', async () => {
    const order: string[] = [];
    const publishingService = {
      assertCanEdit: jest.fn(async () => {
        order.push('assertCanEdit');
      }),
    } as unknown as jest.Mocked<PublishingService>;
    const service = {
      update: jest.fn(async () => {
        order.push('update');
        return {} as never;
      }),
    } as unknown as jest.Mocked<SeasonsService>;

    await new SeasonsController(service, publishingService).update(seasonId, dto, actor);

    expect(order).toEqual(['assertCanEdit', 'update']);
  });

  it('saves nothing when the review refuses the edit', async () => {
    const publishingService = {
      assertCanEdit: jest.fn(async () => {
        throw new Error('under review');
      }),
    } as unknown as jest.Mocked<PublishingService>;
    const service = { update: jest.fn() } as unknown as jest.Mocked<SeasonsService>;

    await expect(
      new SeasonsController(service, publishingService).update(seasonId, dto, actor),
    ).rejects.toThrow('under review');
    expect(service.update).not.toHaveBeenCalled();
  });
});
