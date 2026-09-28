import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionsRepository } from './permissions.repository.js';

/**
 * `findOne`'s behaviour change (owner decision 2026-09-27, alongside exposing
 * `superAdminOnly`): an unknown id now 404s instead of the controller
 * returning `null` straight through — which `PermissionsService.toResponse`
 * would otherwise throw on, reading `._id` off `null`. An untested behaviour
 * change is exactly what this batch must not ship.
 *
 * `PermissionsService` is constructed for real rather than mocked, so
 * `toResponse` — the derivation this pair of tests exists to prove — is the
 * genuine implementation, not a second copy of it written into the test.
 * Only `PermissionsRepository.findById` is a mock; `validateResourceTypes`
 * (the other reader of the repository) is never invoked here.
 */
describe('PermissionsController', () => {
  const repository = { findById: jest.fn() } as unknown as jest.Mocked<PermissionsRepository>;
  const service = new PermissionsService(repository, {} as never);
  const controller = new PermissionsController(service);

  it('404s for an id that resolves to no permission', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(controller.findOne(new Types.ObjectId().toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the mapped response, including the derived superAdminOnly, for a known id', async () => {
    const permissionId = new Types.ObjectId();
    repository.findById.mockResolvedValue({
      _id: permissionId,
      name: { en: 'Read users', ar: 'قراءة المستخدمين' },
      resourceType: 'users',
      action: 'Read',
      scope: null,
    } as never);

    const result = await controller.findOne(permissionId.toString());

    expect(result).toEqual({
      id: permissionId.toString(),
      name: { en: 'Read users', ar: 'قراءة المستخدمين' },
      resourceType: 'users',
      action: 'Read',
      scope: null,
      // `users:Read` is one of Decision 4's eight reserved pairs — proves the
      // field is derived from `isSuperAdminOnly`, not copied off the row.
      superAdminOnly: true,
    });
  });

  /**
   * Independent review, round 4 (M8): the test above alone asserted only
   * `superAdminOnly: true`, which a `toResponse` hard-coding `true` for
   * every row would also pass. This ordinary pair closes that: `isSuperAdminOnly`
   * is exercised in BOTH directions here (`capability-map.spec.ts` already
   * covers the function itself; this covers the controller actually calling
   * it rather than a constant).
   */
  it('answers superAdminOnly: false for an ordinary, non-reserved pair', async () => {
    const permissionId = new Types.ObjectId();
    repository.findById.mockResolvedValue({
      _id: permissionId,
      name: { en: 'Update clubs', ar: 'تحديث الأندية' },
      resourceType: 'clubs',
      action: 'Update',
      scope: null,
    } as never);

    const result = await controller.findOne(permissionId.toString());

    expect(result.superAdminOnly).toBe(false);
  });
});
