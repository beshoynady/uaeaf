import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * ADR-0105 — the platform must never reach a state where no Super Admin can
 * sign in.
 *
 * Before this, `assignRoles` and `updateAccountStatus` refused only self-action,
 * so a second holder of `users:Update` could suspend the sole Super Admin or
 * strip their role. And there was no way back: `seedAdminUser` documents that it
 * leaves an existing account "entirely alone — password, roles and status", and
 * it is right to, so re-running the bootstrap does not recover it.
 */
describe('UsersService — the last Super Admin', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  const targetId = new Types.ObjectId().toString();
  const systemRoleId = new Types.ObjectId();

  /** A Super Admin acting: holds everything, so rules 1 and 2 never fire and
   *  only the last-holder rule is under test. */
  const superAdmin: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    roleIds: [systemRoleId.toString()],
    permissions: [
      { resourceType: 'users', action: 'Update' },
      { resourceType: 'users', action: 'Read' },
      { resourceType: 'roles', action: 'Update' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            create: jest.fn(),
            updateById: jest.fn(),
            findById: jest.fn(),
            countActiveSuperAdmins: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            assertAssignable: jest.fn(),
            resolvePermissionsForRoles: jest.fn(),
            isSystemRole: jest.fn(),
            findAll: jest.fn(async () => []),
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

    rolesService.assertAssignable.mockResolvedValue(undefined as never);
    rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);
    // The target holds a system role in every test below.
    rolesService.isSystemRole.mockResolvedValue(true as never);
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [systemRoleId],
    } as never);
    repository.updateById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [systemRoleId],
      name: { en: 'T', ar: 'ت' },
      email: 't@uaeaf.ae',
      accountStatus: 'Active',
      lastLogin: null,
      personId: null,
      photoId: null,
      preferredLanguage: null,
      preferredTheme: null,
    } as never);
  });

  describe('when nobody else holds the role', () => {
    beforeEach(() => {
      repository.countActiveSuperAdmins.mockResolvedValue(0 as never);
    });

    it('refuses to suspend them, and writes nothing', async () => {
      await expect(
        service.updateAccountStatus(targetId, 'Suspended', superAdmin),
      ).rejects.toMatchObject({ response: { code: 'lastSuperAdmin' } });

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses to deactivate them', async () => {
      await expect(
        service.updateAccountStatus(targetId, 'Deactivated', superAdmin),
      ).rejects.toMatchObject({ response: { code: 'lastSuperAdmin' } });
    });

    it('refuses to strip the system role from them', async () => {
      await expect(service.assignRoles(targetId, [], superAdmin)).rejects.toMatchObject({
        response: { code: 'lastSuperAdmin' },
      });

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    // "I'll demote myself for a moment" is how the last one goes.
    it('refuses even when the last Super Admin asks for it themselves', async () => {
      repository.findById.mockResolvedValue({
        _id: new Types.ObjectId(superAdmin.userId),
        roleIds: [systemRoleId],
      } as never);

      await expect(service.assertNotLastSuperAdmin(superAdmin.userId)).rejects.toMatchObject({
        response: { code: 'lastSuperAdmin' },
      });
    });

    it('still allows restoring them to Active — that adds a holder, never removes one', async () => {
      await expect(
        service.updateAccountStatus(targetId, 'Active', superAdmin),
      ).resolves.toBeDefined();
    });

    /**
     * A role change that KEEPS a system role removes no holder, so the
     * last-holder rule must not fire on it — otherwise the last Super Admin
     * could never have a second role added beside their first.
     *
     * This is only reachable because a Super Admin may appoint another (ADR-0104
     * as written). While the code refused every system role outright, this case
     * could not occur and the branch guarding it was briefly deleted as dead.
     */
    it('allows a role change that keeps a system role, even for the last holder', async () => {
      await expect(
        service.assignRoles(targetId, [systemRoleId], superAdmin),
      ).resolves.toBeDefined();
    });
  });

  describe('when a second holder exists', () => {
    beforeEach(() => {
      repository.countActiveSuperAdmins.mockResolvedValue(1 as never);
    });

    it('allows the suspension', async () => {
      await expect(
        service.updateAccountStatus(targetId, 'Suspended', superAdmin),
      ).resolves.toBeDefined();
    });

    it('allows stripping the role', async () => {
      await expect(service.assignRoles(targetId, [], superAdmin)).resolves.toBeDefined();
    });
  });

  it('leaves an account holding no system role alone', async () => {
    rolesService.isSystemRole.mockResolvedValue(false as never);

    await expect(service.assertNotLastSuperAdmin(targetId)).resolves.toBeUndefined();
    expect(repository.countActiveSuperAdmins).not.toHaveBeenCalled();
  });

  /**
   * The count asks "would anyone be left", not "how many are there", and it is
   * read inside the handler immediately before the write (CLAUDE.md §31) rather
   * than captured when the request began.
   *
   * That is all this asserts. It does NOT establish concurrency safety — see the
   * failing test below, and the note on
   * `UsersRepository.countActiveSuperAdmins`.
   */
  it('asks whether anyone else would be left, excluding the target', async () => {
    repository.countActiveSuperAdmins.mockResolvedValue(0 as never);

    await expect(service.assertNotLastSuperAdmin(targetId)).rejects.toMatchObject({
      response: { code: 'lastSuperAdmin' },
    });

    expect(repository.countActiveSuperAdmins).toHaveBeenCalledWith(targetId);
  });

  /**
   * KNOWN OPEN — two concurrent demotions of two different Super Admins both
   * succeed, leaving the platform with none.
   *
   * With holders A and B, a request demoting A and a request demoting B each ask
   * "is anyone else active" and each is truthfully told yes, because the other
   * has not been written yet. Both proceed. Excluding the target does not help:
   * it is the same arithmetic as counting all and comparing to one.
   *
   * Closing it needs the count and the write to be a single operation — a
   * transaction, or a conditional write that MongoDB arbitrates. Neither exists
   * in this codebase yet and the connection string is not configured for
   * transactions, so the fix is an architectural decision rather than a patch,
   * and it is recorded for the owner rather than guessed at.
   *
   * `it.failing` deliberately: this asserts the behaviour that is WANTED, so it
   * fails today and turns green the day the write becomes atomic. A passing test
   * asserting today's outcome would read as the property being intended.
   */
  it.failing('refuses the second of two concurrent demotions', async () => {
    // Both requests see one other active holder — the truth at the moment each
    // asks, because neither write has landed.
    repository.countActiveSuperAdmins.mockResolvedValue(1 as never);
    const second = new Types.ObjectId().toString();
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [systemRoleId],
    } as never);

    const outcomes = await Promise.allSettled([
      service.updateAccountStatus(targetId, 'Suspended', superAdmin),
      service.updateAccountStatus(second, 'Suspended', superAdmin),
    ]);

    // Wanted: exactly one succeeds. Actual today: both do.
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });
});
