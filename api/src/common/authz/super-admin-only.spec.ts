import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CAPABILITY_MAP } from './capability-map.js';
import { PERMISSION_CATALOGUE } from '../constants/permission-catalogue.js';
import { RolesService } from '../../modules/platform-administration/roles/roles.service.js';
import { RolesRepository } from '../../modules/platform-administration/roles/roles.repository.js';
import { RoleAssignmentsRepository } from '../../modules/platform-administration/roles/role-assignments.repository.js';
import { PermissionsService } from '../../modules/platform-administration/permissions/permissions.service.js';

/**
 * Owner decision 4 (2026-09-26) and Q-A (2026-09-27): account and role
 * administration — and reading account data — are exclusive to the Super
 * Admin, like `ManageSecuritySettings`.
 *
 * TEN pairs may be held by the seeded Super Admin role and by no other —
 * NOT eleven. The task text this file was commissioned from named a ninth,
 * `securitySettings:ManageSecuritySettings`, and iterated it in the same
 * `it.each` as the other eight; that pair cannot be declared today because
 * `securitySettings` is not in `PERMISSION_RESOURCES` at all yet — the
 * collection arrives in Batch 5. `capability-map.spec.ts` pins the same
 * ten at the map level; this file pins the REFUSAL behaviour, which did
 * not exist before this task.
 *
 * `users:Archive` and `users:Restore` joined the eight 2026-09-28: an
 * independent review found both routes guarded by grantable pairs, leaking
 * data `users:Read` exists to protect. See ADR-0104.
 *
 * The reason is not that they are dangerous in the abstract — ADR-0104's two
 * rules already made a delegated account administrator nearly inert (they
 * could only hand out roles weaker than themselves), so the grant promised
 * far more than it could do. Making that explicit is more honest than a
 * capability that quietly refuses most of its own name.
 *
 * Enforced at ONE path only: a role may not be BUILT holding one of these
 * (`RolesService.assertGrantable`, tested below with the actor holding the
 * WHOLE catalogue, so "the actor doesn't hold enough" can never be the
 * reason for the refusal actually under test). It is deliberately NOT
 * repeated on the path that hands a role to a person
 * (`UsersService.assertAssignableByActor`): since no role but the seeded
 * Super Admin role can ever hold one of these ten, that path's ordinary
 * superset comparison already means only another holder of the pair — in
 * practice, another Super Admin — may assign it. A second refusal there
 * would deny exactly that appointment unconditionally, which is the one-way
 * ratchet ADR-0105's `lastSuperAdmin` advice ("appoint another Super Admin
 * before changing the last one's account") depends on staying open. Fixed
 * in review (2026-09-27) after shipping the repeated check first — see
 * `users.service.authority.spec.ts` for the pair of tests that pins the
 * boundary this leaves: the escalation stays closed (a non-covering actor
 * is still refused, by rule 1), the recovery path stays open (a covering
 * actor — a Super Admin — may still appoint another).
 *
 * What is refused here is GRANTING, not holding — the seeded Super Admin
 * role still carries all ten (see the `PERMISSION_CATALOGUE` test below).
 */
describe('the un-grantable pairs', () => {
  const RESERVED = [
    ['users', 'Create'],
    ['users', 'Update'],
    ['users', 'AssignRoles'],
    ['users', 'Read'],
    ['users', 'Export'],
    ['users', 'Archive'],
    ['users', 'Restore'],
    ['roles', 'ManageRoles'],
    ['roles', 'Read'],
    ['permissions', 'Read'],
  ] as const;

  it('is exactly these ten, and no others', () => {
    const declared = CAPABILITY_MAP.flatMap((entry) =>
      entry.superAdminOnly.map((action) => [entry.resourceType, action] as const),
    );
    expect(declared.map(([r, a]) => `${r}:${a}`).sort()).toEqual(
      RESERVED.map(([r, a]) => `${r}:${a}`).sort(),
    );
  });

  it('leaves the seeded Super Admin role holding all ten — what is refused is granting, not holding', () => {
    const catalogue = new Set(PERMISSION_CATALOGUE.map((e) => `${e.resourceType}:${e.action}`));
    for (const [resourceType, action] of RESERVED) {
      expect(catalogue.has(`${resourceType}:${action}`)).toBe(true);
    }
  });

  describe('refused when a role is BUILT holding one', () => {
    let service: RolesService;
    let repository: jest.Mocked<RolesRepository>;
    let permissionsService: jest.Mocked<PermissionsService>;

    const name = { en: 'x', ar: 'س' };
    const permissionId = new Types.ObjectId();
    // Holds the entire catalogue — refusal here can only be the reserved-pair
    // rule, never plain "you do not hold this".
    const EVERYTHING = PERMISSION_CATALOGUE.map((entry) => ({ ...entry }));

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RolesService,
          { provide: RolesRepository, useValue: { create: jest.fn(), findByIds: jest.fn() } },
          { provide: RoleAssignmentsRepository, useValue: { detachRole: jest.fn() } },
          { provide: PermissionsService, useValue: { findById: jest.fn() } },
        ],
      }).compile();

      service = module.get(RolesService);
      repository = module.get(RolesRepository);
      permissionsService = module.get(PermissionsService);
      repository.findByIds.mockResolvedValue([]);
    });

    it.each(RESERVED)('refuses %s:%s when a role is built with it', async (resourceType, action) => {
      permissionsService.findById.mockResolvedValue({ _id: permissionId, resourceType, action } as never);

      await expect(
        service.create({ name, permissionIds: [permissionId.toString()] } as never, EVERYTHING),
      ).rejects.toMatchObject({ response: { code: 'ungrantableCapability' } });
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  // Deliberately no "HANDED OUT" describe block here — see the module
  // docstring above. `UsersService.assertAssignableByActor` does not check
  // `isSuperAdminOnly` at all; the boundary that path enforces instead (a
  // non-covering actor still refused, a covering one still permitted) is
  // pinned in `users.service.authority.spec.ts`, beside the escalation test
  // it was written to close.
});
