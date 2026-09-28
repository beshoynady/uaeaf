import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { MeController } from './me.controller.js';
import { RolesService } from '../roles/roles.service.js';
import { UsersService } from '../users/users.service.js';
import { UsersRepository } from '../users/users.repository.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

describe('GET /me/permissions', () => {
  let controller: MeController;
  let rolesService: {
    isSystemRole: jest.Mock<(roleId: string) => Promise<boolean>>;
    resolvePermissions: jest.Mock;
    resolvePermissionsForRoles: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let usersRepository: { findById: jest.Mock };

  const ID = new Types.ObjectId().toString();
  const ROLE_ID = new Types.ObjectId().toString();
  const ARCHIVED_ROLE_ID = new Types.ObjectId().toString();

  const actorOf = (permissions: AuthenticatedUser['permissions']): AuthenticatedUser => ({
    userId: ID,
    roleIds: [ROLE_ID],
    permissions,
  });

  beforeEach(async () => {
    rolesService = {
      isSystemRole: jest.fn(async () => false),
      resolvePermissions: jest.fn(),
      resolvePermissionsForRoles: jest.fn(),
    };
    usersService = { findById: jest.fn() };
    usersRepository = { findById: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [MeController],
      providers: [
        { provide: RolesService, useValue: rolesService },
        { provide: UsersService, useValue: usersService },
        { provide: UsersRepository, useValue: usersRepository },
      ],
    }).compile();

    controller = module.get(MeController);
  });

  it('returns the caller’s own resolved pairs, with their scopes', async () => {
    const actor = actorOf([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);
    await expect(controller.permissions(actor)).resolves.toMatchObject({
      permissions: [{ resourceType: 'articles', action: 'Update', scope: 'own' }],
    });
  });

  it('spells an absent scope as null rather than omitting the key', async () => {
    const actor = actorOf([{ resourceType: 'clubs', action: 'Read' }]);
    const body = await controller.permissions(actor);
    expect(body.permissions[0]).toHaveProperty('scope', null);
  });

  it('answers 200 with an empty list for an account holding no role', async () => {
    await expect(controller.permissions({ userId: ID, roleIds: [], permissions: [] })).resolves.toEqual({
      permissions: [],
      accountClass: 'standard',
    });
  });

  it('answers 200 for a token whose roles were all archived since it was issued', async () => {
    rolesService.isSystemRole.mockResolvedValue(false);
    await expect(
      controller.permissions({ userId: ID, roleIds: [ARCHIVED_ROLE_ID], permissions: [] }),
    ).resolves.toMatchObject({ permissions: [], accountClass: 'standard' });
    expect(rolesService.isSystemRole).toHaveBeenCalledWith(ARCHIVED_ROLE_ID);
  });

  it('is superAdmin when any one of the caller’s roles is a system role', async () => {
    const SYSTEM_ROLE_ID = new Types.ObjectId().toString();
    rolesService.isSystemRole.mockImplementation(async (roleId) => roleId === SYSTEM_ROLE_ID);
    await expect(
      controller.permissions({ userId: ID, roleIds: [ROLE_ID, SYSTEM_ROLE_ID], permissions: [] }),
    ).resolves.toMatchObject({ accountClass: 'superAdmin' });
  });

  it('is sensitive for a caller with no system role who holds Export', async () => {
    const actor = actorOf([{ resourceType: 'athletes', action: 'Export', scope: null }]);
    await expect(controller.permissions(actor)).resolves.toMatchObject({ accountClass: 'sensitive' });
  });

  it('is standard for a caller with no system role who holds only articles:Update', async () => {
    const actor = actorOf([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);
    await expect(controller.permissions(actor)).resolves.toMatchObject({ accountClass: 'standard' });
  });

  it('reads nothing about any other account', async () => {
    await controller.permissions(actorOf([]));
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(usersRepository.findById).not.toHaveBeenCalled();
  });

  it('never re-resolves permissions — it uses the set the guard already built', async () => {
    await controller.permissions(actorOf([{ resourceType: 'clubs', action: 'Read' }]));
    expect(rolesService.resolvePermissions).not.toHaveBeenCalled();
    expect(rolesService.resolvePermissionsForRoles).not.toHaveBeenCalled();
  });
});
