import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';

/**
 * The other half of "you cannot hand out what you do not hold": **you cannot
 * take away what you do not hold either.**
 *
 * ADR-0104 rule 2 refuses acting on an account stronger than you, comparing the
 * target's CURRENT grants. Nothing stopped an actor from shrinking those grants
 * first, through a route that only ever checked what was being ADDED:
 *
 *   1. `PATCH /roles/<theirRole>/permissions` with a tiny list. `assertGrantable`
 *      passes — it verifies each NEW permission is held by the actor, never that
 *      the actor holds what is being REMOVED.
 *   2. `PATCH /users/<them>/status` — `assertNotStronger` now passes, because
 *      step 1 made them weak.
 *
 * `DELETE /roles/:id` was the blunter variant: one call strips the role from
 * every holder with no comparison against the actor at all.
 *
 * This does not escalate the actor's own authority — rule 1 still bounds what
 * they may grant — but it is a complete bypass of the guard rule 2 was built to
 * be, and it becomes an account-takeover step the moment setup links and 2FA
 * reset land behind the same guard (found by independent review, 2026-09-27).
 */
describe('RolesService — you cannot remove authority you do not hold', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let assignments: jest.Mocked<RoleAssignmentsRepository>;

  const roleId = new Types.ObjectId().toString();
  const usersReadId = new Types.ObjectId();
  const clubsReadId = new Types.ObjectId();
  const governanceId = new Types.ObjectId();

  /** An actor who may edit roles, and holds only the two user reads, plus one
   *  ordinary permission (`clubs:Read`) used by the "fully covers" test below
   *  — `users:Read` and `roles:Read` are both Decision 4 reserved pairs
   *  (2026-09-27) and are refused unconditionally when GRANTED, which is not
   *  the rule this file is about. They stay on this actor because rule 2
   *  (`assertRemovable`) still compares what the role currently holds against
   *  what the actor holds, regardless of grantability. */
  const weakActor: RequiredPermission[] = [
    { resourceType: 'roles', action: 'Update' },
    { resourceType: 'roles', action: 'Read' },
    { resourceType: 'users', action: 'Read' },
    { resourceType: 'clubs', action: 'Read' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            findByIdIncludingArchived: jest.fn(),
            findByIds: jest.fn(),
            updateById: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        { provide: PermissionsService, useValue: { findById: jest.fn(), findByIds: jest.fn() } },
        { provide: RoleAssignmentsRepository, useValue: { detachRole: jest.fn() } },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = module.get(RolesRepository);
    permissionsService = module.get(PermissionsService);
    assignments = module.get(RoleAssignmentsRepository);

    repository.updateById.mockResolvedValue({ _id: new Types.ObjectId(roleId) } as never);
    repository.softDelete.mockResolvedValue({ _id: new Types.ObjectId(roleId) } as never);
    assignments.detachRole.mockResolvedValue(undefined as never);
  });

  /** A role the actor cannot match: it grants governance authority they lack. */
  const roleGrantsGovernance = () => {
    repository.findByIdIncludingArchived.mockResolvedValue({
      _id: new Types.ObjectId(roleId),
      isSystemRole: false,
      archivedAt: null,
      permissionIds: [governanceId],
    } as never);
    repository.findByIds.mockResolvedValue([
      { _id: new Types.ObjectId(roleId), permissionIds: [governanceId] },
    ] as never);
    permissionsService.findByIds.mockResolvedValue([
      { _id: governanceId, resourceType: 'committees', action: 'Update' },
    ] as never);
  };

  describe('updatePermissions', () => {
    it('refuses to shrink a role that grants more than the actor holds', async () => {
      roleGrantsGovernance();
      // The incoming list is one permission the actor DOES hold, so the
      // "cannot grant what you do not hold" rule passes cleanly.
      permissionsService.findById.mockResolvedValue({
        _id: usersReadId,
        resourceType: 'users',
        action: 'Read',
      } as never);

      await expect(
        service.updatePermissions(roleId, [usersReadId], weakActor),
      ).rejects.toMatchObject({ response: { code: 'ungrantableRole' } });

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('allows shrinking a role the actor fully covers', async () => {
      // `clubs:Read`, not `users:Read` — the latter is a Decision 4 reserved
      // pair (2026-09-27) and `assertGrantable` refuses it unconditionally,
      // which would make this "fully covers" case indistinguishable from the
      // reserved-pair rule. See `super-admin-only.spec.ts` for that rule.
      repository.findByIdIncludingArchived.mockResolvedValue({
        _id: new Types.ObjectId(roleId),
        isSystemRole: false,
        archivedAt: null,
        permissionIds: [clubsReadId],
      } as never);
      repository.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(roleId), permissionIds: [clubsReadId] },
      ] as never);
      permissionsService.findByIds.mockResolvedValue([
        { _id: clubsReadId, resourceType: 'clubs', action: 'Read' },
      ] as never);
      permissionsService.findById.mockResolvedValue({
        _id: clubsReadId,
        resourceType: 'clubs',
        action: 'Read',
      } as never);

      await expect(service.updatePermissions(roleId, [clubsReadId], weakActor)).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('refuses to archive a role that grants more than the actor holds', async () => {
      roleGrantsGovernance();

      await expect(
        service.remove(roleId, new Types.ObjectId(), weakActor),
      ).rejects.toMatchObject({ response: { code: 'ungrantableRole' } });

      expect(repository.softDelete).not.toHaveBeenCalled();
      expect(assignments.detachRole).not.toHaveBeenCalled();
    });

    it('allows archiving a role the actor fully covers', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue({
        _id: new Types.ObjectId(roleId),
        isSystemRole: false,
        archivedAt: null,
        permissionIds: [usersReadId],
      } as never);
      repository.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(roleId), permissionIds: [usersReadId] },
      ] as never);
      permissionsService.findByIds.mockResolvedValue([
        { _id: usersReadId, resourceType: 'users', action: 'Read' },
      ] as never);

      await expect(service.remove(roleId, new Types.ObjectId(), weakActor)).resolves.toBeDefined();
      expect(assignments.detachRole).toHaveBeenCalledWith(roleId);
    });
  });
});
