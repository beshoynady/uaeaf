import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
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

    it('refuses a system role outright, whatever the actor holds', async () => {
      rolesService.isSystemRole.mockResolvedValue(true as never);
      rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);

      await expect(
        service.create({ ...baseDto, roleIds: [superAdminRoleId.toString()] } as never, staffAdmin),
      ).rejects.toMatchObject({ response: { code: 'ungrantableRole' } });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('allows a role whose every grant the actor already holds', async () => {
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'users', action: 'Read' },
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
        permissions: [{ resourceType: 'articles', action: 'Update', scope: 'own' } as never],
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
      rolesService.resolvePermissionsForRoles.mockResolvedValue([
        { resourceType: 'users', action: 'Read' },
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
      expect(rolesService.resolvePermissionsForRoles).not.toHaveBeenCalled();
    });
  });
});
