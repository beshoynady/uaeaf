import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles/roles.service.js';
import { RolesRepository } from './roles/roles.repository.js';
import { RoleAssignmentsRepository } from './roles/role-assignments.repository.js';
import { PermissionsService } from './permissions/permissions.service.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';

/**
 * The four refusals that share one status and mean four different things.
 *
 * `PermissionsGuard`, `RolesService` and `UsersController` all answer 403,
 * and the remedy differs every time: ask for a permission, stop touching a
 * system role, get a permission granted to you first, or ask a colleague to
 * do it. A client that cannot tell them apart can only say "refused".
 *
 * Until 2026-09-08 the dashboard told them apart by matching fragments of
 * their English messages, and that contract had already broken: the
 * self-status refusal added the same day is worded differently from the
 * self-role-assignment one, shares no fragment with it, and so reported as
 * a missing permission — which it is not.
 *
 * These tests read the code off the exception body, which is the contract
 * itself. Reword any of these sentences freely; break a code and this fails.
 */
/** The code the API would put on the wire for this refusal. Fails loudly if
 *  nothing was thrown — a silent pass here would mean the guard is gone. */
async function refusalCode(act: () => Promise<unknown>): Promise<unknown> {
  try {
    await act();
  } catch (error) {
    const body = (error as ForbiddenException).getResponse();
    return typeof body === 'object' && body !== null
      ? (body as { code?: unknown }).code
      : undefined;
  }
  throw new Error('Expected the call to be refused, but it resolved.');
}

describe('403 refusals carry distinguishable codes', () => {
  describe('RolesService', () => {
    let service: RolesService;
    let repository: jest.Mocked<RolesRepository>;
    let permissionsService: jest.Mocked<PermissionsService>;

    const id = new Types.ObjectId().toString();

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RolesService,
          {
            provide: RolesRepository,
            useValue: {
              findByIdIncludingArchived: jest.fn(),
              updateById: jest.fn(),
              softDelete: jest.fn(),
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
    });

    it('marks a system-role refusal `systemRole`', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue({
        _id: new Types.ObjectId(id),
        isSystemRole: true,
        archivedAt: null,
      } as never);

      expect(await refusalCode(() => service.remove(id, new Types.ObjectId()))).toBe(
        'systemRole',
      );
    });

    it('marks an escalation refusal `ungrantablePermission`', async () => {
      // Holding roles:Update is not the same as holding what you are about
      // to grant with it — the escalation chain closed on 2026-09-05.
      repository.findByIdIncludingArchived.mockResolvedValue({
        _id: new Types.ObjectId(id),
        isSystemRole: false,
        archivedAt: null,
      } as never);
      permissionsService.findById.mockResolvedValue({
        resourceType: 'users',
        action: 'Delete',
      } as never);

      expect(
        await refusalCode(() =>
          service.updatePermissions(id, [new Types.ObjectId()], [
            { resourceType: 'roles', action: 'Update' },
          ]),
        ),
      ).toBe('ungrantablePermission');
    });
  });

  describe('UsersController', () => {
    let controller: UsersController;

    const userId = new Types.ObjectId().toString();
    const actor: AuthenticatedUser = { userId, roleIds: [], permissions: [] };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          {
            provide: UsersService,
            useValue: { assignRoles: jest.fn(), updateAccountStatus: jest.fn(), toResponse: jest.fn() },
          },
        ],
      }).compile();

      controller = module.get(UsersController);
    });

    it('marks a self role-assignment refusal `selfAssignment`', async () => {
      expect(
        await refusalCode(() => controller.assignRoles(userId, { roleIds: [] } as never, actor)),
      ).toBe('selfAssignment');
    });

    it('marks a self status-change refusal `selfAssignment` too', async () => {
      // The case the message-matching contract missed entirely: same rule,
      // same remedy, different wording.
      expect(
        await refusalCode(() =>
          controller.updateStatus(userId, { accountStatus: 'Suspended' } as never, actor),
        ),
      ).toBe('selfAssignment');
    });
  });
});
