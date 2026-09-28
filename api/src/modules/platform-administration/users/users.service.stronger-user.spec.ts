import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * ADR-0104 rule 2 — you cannot act on someone stronger than you.
 *
 * Role assignment is the obvious way to acquire another account's authority;
 * credentials are the quiet one. If A may reset B's second factor or reissue
 * B's setup link, A can become B, and B's capabilities become A's without a
 * single permission changing hands. So every route that can acquire an account
 * comes through one function, and it is tested here on its own.
 */
describe('UsersService.assertNotStronger', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  const targetId = new Types.ObjectId().toString();
  const someRoleId = new Types.ObjectId();

  const staffAdmin: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [
      { resourceType: 'users', action: 'Create' },
      { resourceType: 'users', action: 'Read' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: { create: jest.fn(), updateById: jest.fn(), findById: jest.fn() },
        },
        {
          provide: RolesService,
          useValue: {
            assertAssignable: jest.fn(),
            resolvePermissionsForRoles: jest.fn(),
            isSystemRole: jest.fn(),
          },
        },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
        { provide: AuditLogsService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    rolesService.isSystemRole.mockResolvedValue(false as never);
    // Defaulted here rather than left undefined on purpose. The service does
    // NOT coalesce an unreadable resolution to "no grants" — that would fail
    // open, letting an actor act on a target whose authority could not be read.
    rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);
  });

  const targetHolding = (...grants: { resourceType: string; action: string }[]) => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [someRoleId],
    } as never);
    rolesService.resolvePermissionsForRoles.mockResolvedValue(grants as never);
  };

  it('refuses when the target holds a capability the actor lacks', async () => {
    targetHolding({ resourceType: 'roles', action: 'Update' });

    await expect(service.assertNotStronger(targetId, staffAdmin)).rejects.toMatchObject({
      response: { code: 'targetStronger' },
    });
  });

  it('names what put the target beyond reach', async () => {
    targetHolding({ resourceType: 'roles', action: 'Update' });

    await expect(service.assertNotStronger(targetId, staffAdmin)).rejects.toMatchObject({
      response: { missing: ['roles:Update'] },
    });
  });

  // Review Focus 3. A strict-subset test would deadlock every peer pair — two
  // Super Admins could never administer each other, which is exactly what
  // ADR-0105's last-holder rule then narrows deliberately.
  it('permits acting on a peer with an identical set', async () => {
    targetHolding(
      { resourceType: 'users', action: 'Create' },
      { resourceType: 'users', action: 'Read' },
    );

    await expect(service.assertNotStronger(targetId, staffAdmin)).resolves.toBeUndefined();
  });

  it('permits acting on a weaker account', async () => {
    targetHolding({ resourceType: 'users', action: 'Read' });

    await expect(service.assertNotStronger(targetId, staffAdmin)).resolves.toBeUndefined();
  });

  it('permits acting on an account holding nothing', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [],
    } as never);

    await expect(service.assertNotStronger(targetId, staffAdmin)).resolves.toBeUndefined();
  });

  // An unknown id must not read as "holds nothing", which would make a
  // non-existent account the weakest possible target and let the caller
  // through to whatever comes next.
  it('reports an unknown target as not found rather than as weak', async () => {
    repository.findById.mockResolvedValue(null as never);

    await expect(service.assertNotStronger(targetId, staffAdmin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('wired into the routes that can acquire an account', () => {
    it('blocks a role change on a stronger account before writing', async () => {
      targetHolding({ resourceType: 'roles', action: 'Update' });

      await expect(service.assignRoles(targetId, [], staffAdmin)).rejects.toMatchObject({
        response: { code: 'targetStronger' },
      });
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('blocks a status change on a stronger account before writing', async () => {
      targetHolding({ resourceType: 'roles', action: 'Update' });

      await expect(
        service.updateAccountStatus(targetId, 'Suspended', staffAdmin),
      ).rejects.toMatchObject({ response: { code: 'targetStronger' } });
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });
});
