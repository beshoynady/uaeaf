import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';

/**
 * ADR-0104 created `user-authority.ts` so that role-building and role-
 * assignment could not drift apart. `assertGrantable` was left as a third,
 * independent, pair-only comparison — so once `scope` arrives, role BUILDING
 * would permit widening `own` to `all` while role ASSIGNMENT (which already
 * runs through `missingPairs`) refused it. That divergence is exactly what
 * the shared helper exists to prevent (review finding F7).
 *
 * The scoped pairs below use `Read`, not `Update`: granting a scoped `Update`
 * alone trips the unrelated "whoever may change a resource must be able to
 * read it" rule (`missingImpliedReads`), which would fail these cases for a
 * reason that has nothing to do with the scope comparison under test here.
 */
describe('RolesService.assertGrantable — the one comparison', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;

  const name = { en: 'x', ar: 'س' };
  const permissionId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            create: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        { provide: RoleAssignmentsRepository, useValue: { detachRole: jest.fn() } },
        { provide: PermissionsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = module.get(RolesRepository);
    permissionsService = module.get(PermissionsService);
    repository.create.mockResolvedValue({ name } as never);
  });

  it('refuses a permission the actor does not hold at all', async () => {
    // `clubs:Update`, not `roles:ManageRoles` — the latter is one of
    // Decision 4's eight reserved pairs (2026-09-27) and would be refused as
    // `ungrantableCapability` before this comparison ever ran, which is a
    // different rule than the one under test here.
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'clubs',
      action: 'Update',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'users', action: 'Read' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'ungrantablePermission' } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a permission stored at a wider scope than the actor holds', async () => {
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'articles',
      action: 'Read',
      scope: 'all',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'articles', action: 'Read', scope: 'own' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'ungrantablePermission' } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows a narrower scope than the actor holds', async () => {
    permissionsService.findById.mockResolvedValue({
      _id: permissionId,
      resourceType: 'articles',
      action: 'Read',
      scope: 'own',
    } as never);

    await expect(
      service.create({ name, permissionIds: [permissionId.toString()] } as never, [
        { resourceType: 'articles', action: 'Read', scope: 'all' },
      ]),
    ).resolves.toBeDefined();
  });
});
