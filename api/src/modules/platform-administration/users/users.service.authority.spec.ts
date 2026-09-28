import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * The escalation the roles review proved, and the rule that closes it.
 *
 * `users:Create` was enough to become Super Admin: the coherence rule forces
 * any role holding it to also hold `users:Read`, `GET /users` reveals every
 * account's `roleIds` including the Super Admin role's id, and `POST /users`
 * accepted both that id and a caller-chosen password. Two calls.
 *
 * The cause was an asymmetry, not an oversight in one place: "you cannot grant
 * what you do not hold" was enforced when a role is BUILT (`RolesService`) and
 * nowhere when a role is HANDED OUT. These tests pin the second half.
 */
describe('UsersService — you cannot assign what you do not hold', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  const superAdminRoleId = new Types.ObjectId();
  const editorRoleId = new Types.ObjectId();
  const targetId = new Types.ObjectId().toString();

  /** An actor who may create and read accounts, and nothing else — the exact
   *  shape of the role the review showed was equivalent to Super Admin. */
  const staffAdmin: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [
      { resourceType: 'users', action: 'Create' },
      { resourceType: 'users', action: 'Read' },
      // An ordinary, non-reserved permission — used by the "allows" tests
      // below. `users:Create`/`users:Read` are both Decision 4 reserved
      // pairs (2026-09-27) as of this writing, so neither can stand in for
      // "a permission this actor may pass on" any more; this one can.
      { resourceType: 'clubs', action: 'Update' },
    ],
  };

  /** `password` is still required by `CreateUserDto`. ADR-0110 removes it in
   *  favour of a setup link, which is Batch 5 — until then a create call that
   *  omits it fails inside bcrypt, not in the rule under test here. */
  const baseDto = {
    name: { en: 'Sara', ar: 'سارة' },
    email: 'sara@uaeaf.ae',
    password: 'correct horse battery staple',
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

    rolesService.assertAssignable.mockResolvedValue(undefined as never);
    rolesService.isSystemRole.mockResolvedValue(false as never);
    rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);
    repository.create.mockResolvedValue({ email: baseDto.email } as never);
    repository.updateById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [],
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

  describe('create', () => {
    it('refuses an account holding a role the actor does not hold, and writes nothing', async () => {
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'roles', action: 'Update' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, staffAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('names the pairs it refused, so the gap is fixable rather than mysterious', async () => {
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'roles', action: 'Update' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, staffAdmin),
      ).rejects.toMatchObject({
        response: { code: 'ungrantableRole', missing: ['roles:Update'] },
      });
    });

    /**
     * A system role is not special-cased — it is refused by the same comparison
     * as any other role, because it holds the whole catalogue and almost nobody
     * covers that.
     *
     * An earlier version refused every system role outright. That was stricter
     * than ADR-0104 states ("refused to anyone who does not already hold it")
     * and it had a consequence nobody wanted: `lastSuperAdmin` tells an
     * administrator to appoint a second Super Admin first, and with a blanket
     * refusal no route could. The guard became a one-way ratchet whose own
     * advice was unfollowable (found by independent review, 2026-09-27).
     */
    it('refuses a system role to an actor who does not cover it', async () => {
      rolesService.isSystemRole.mockResolvedValue(true as never);
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'roles', action: 'Update' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, staffAdmin),
      ).rejects.toMatchObject({ response: { code: 'ungrantableRole' } });

      expect(repository.create).not.toHaveBeenCalled();
    });

    /**
     * Decision 4 / Q-A (2026-09-27) reserves `users:Create` and `users:Read`
     * (among six others) to the seeded Super Admin role, but ONLY at the
     * point a role is BUILT (`RolesService.assertGrantable`) — no custom
     * role can ever hold one, so the only role that resolves to this grant
     * is the Super Admin role itself. This path (handing a role to a
     * person) does not repeat that refusal: it only compares the role's
     * grants against the actor's own, which is what lets a Super Admin
     * appoint another — the recovery path ADR-0105's `lastSuperAdmin`
     * advice depends on staying open. Refusing it here too would be the
     * same one-way ratchet the blanket system-role refusal was removed for,
     * two paragraphs above in the source.
     */
    it('still lets a fully-covering actor appoint another holder of a reserved role', async () => {
      rolesService.isSystemRole.mockResolvedValue(true as never);
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'users', action: 'Create' },
        { resourceType: 'users', action: 'Read' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, staffAdmin),
      ).resolves.toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    /**
     * The other half of the same boundary: coverage is still required. An
     * actor who does not hold `users:Create`/`users:Read` themselves is
     * refused by the ordinary rule 1 comparison (`ungrantableRole`) —
     * exactly the escalation the review proved and rule 1 already closes.
     * Nothing about removing the reserved-pair check from this path reopens
     * it: it was never what closed it.
     */
    it('still refuses a non-covering actor the same reserved-pair role, via the ordinary rule', async () => {
      const nonCoveringActor: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        roleIds: [],
        permissions: [{ resourceType: 'clubs', action: 'Update' }],
      };
      rolesService.isSystemRole.mockResolvedValue(true as never);
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'users', action: 'Create' },
        { resourceType: 'users', action: 'Read' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, nonCoveringActor),
      ).rejects.toMatchObject({
        response: { code: 'ungrantableRole', missing: ['users:Create', 'users:Read'] },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('allows a role whose every grant the actor already holds', async () => {
      // `clubs:Update`, kept distinct from `users:Read` on purpose (corrected
      // 2026-09-27, independent review round 4, M5): `users:Read` is a
      // reserved pair, but reserved pairs are refused only when a role is
      // BUILT (`RolesService.assertGrantable`), not on this path — a
      // fully-covering actor MAY be handed one, which is exactly what "still
      // lets a fully-covering actor appoint another holder of a reserved
      // role" above already proves. This test is about the plain superset
      // rule on an ordinary pair, kept separate so the two are not
      // conflated.
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'clubs', action: 'Update' },
      ] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [editorRoleId.toString()] } as never, staffAdmin),
      ).resolves.toBeDefined();

      expect(repository.create).toHaveBeenCalled();
    });

    it('needs no role resolution at all for a bare account', async () => {
      await service.create(baseDto as never, staffAdmin);

      expect(rolesService.resolvePermissionsForRoles).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('assignRoles', () => {
    it('refuses to widen a scope the actor holds only as own', async () => {
      const ownOnly: AuthenticatedUser = {
        userId: new Types.ObjectId().toString(),
        roleIds: [],
        permissions: [{ resourceType: 'articles', action: 'Update', scope: 'own' }],
      };
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'articles', action: 'Update', scope: 'all' },
      ] as never);
      repository.findById.mockResolvedValue({
        _id: new Types.ObjectId(targetId),
        roleIds: [],
      } as never);

      await expect(service.assignRoles(targetId, [editorRoleId], ownOnly)).rejects.toMatchObject({
        response: { code: 'ungrantableRole' },
      });

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('allows assigning a role the actor fully holds', async () => {
      // `clubs:Update`, an ordinary pair — kept distinct from the reserved
      // `users:Read` for the same reason as the `create` test above (M5,
      // independent review round 4): reserved pairs are refused only when a
      // role is BUILT, not when it is handed out, so this and that are two
      // different rules and deserve two different fixtures.
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'clubs', action: 'Update' },
      ] as never);
      repository.findById.mockResolvedValue({
        _id: new Types.ObjectId(targetId),
        roleIds: [],
      } as never);

      await expect(service.assignRoles(targetId, [editorRoleId], staffAdmin)).resolves.toBeDefined();
    });

    it('permits clearing every role — that hands over nothing', async () => {
      repository.findById.mockResolvedValue({
        _id: new Types.ObjectId(targetId),
        roleIds: [],
      } as never);

      await expect(service.assignRoles(targetId, [], staffAdmin)).resolves.toBeDefined();

      // Rule 1 resolves nothing, because an empty list grants nothing. Rule 2
      // still resolves the TARGET's current authority — clearing the roles of
      // an account stronger than you is exactly the act rule 2 refuses, so the
      // read happens with the target's ids, never with the empty incoming list.
      expect(rolesService.resolvePermissionsForRoles).toHaveBeenCalledTimes(1);
      expect(rolesService.resolvePermissionsForRoles).toHaveBeenCalledWith([]);
    });
  });
});
