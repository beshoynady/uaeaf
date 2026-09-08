import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';

describe('RolesService', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByIds: jest.fn(),
            findByIdIncludingArchived: jest.fn(),
            updateById: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        { provide: RoleAssignmentsRepository, useValue: { detachRole: jest.fn() } },
        {
          provide: PermissionsService,
          useValue: {
            findById: jest.fn(),
            findByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = module.get(RolesRepository);
    permissionsService = module.get(PermissionsService);
  });

  describe('rename', () => {
    it('renames a role that is not a system role', async () => {
      const id = new Types.ObjectId().toString();
      const name = { en: 'News Approver', ar: 'معتمد الأخبار' };
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: false, archivedAt: null } as never);
      repository.updateById.mockResolvedValue({ name } as never);

      const result = await service.rename(id, name);

      expect(repository.updateById).toHaveBeenCalledWith(id, { name });
      expect(result).toEqual({ name });
    });

    it('rejects renaming a system role', async () => {
      const id = new Types.ObjectId().toString();
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: true, archivedAt: null } as never);

      await expect(
        service.rename(id, { en: 'Not Super Admin Anymore', ar: 'ليس المشرف العام بعد الآن' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('create — privilege escalation prevention (auth-security-audit-2026-09-05.md P0 #2)', () => {
    it('rejects creating a role with a permission the actor does not hold', async () => {
      const usersUpdatePermissionId = new Types.ObjectId().toString();
      permissionsService.findById.mockResolvedValue({
        resourceType: 'users',
        action: 'Update',
      } as never);

      // Actor only holds roles:Create + users:Update — not users:Update AND
      // the permission they're trying to grant (which resolves to a
      // *different* pair here, simulating the escalation attempt).
      await expect(
        service.create(
          { name: { en: 'Everything', ar: 'كل شيء' }, permissionIds: [usersUpdatePermissionId] },
          [{ resourceType: 'roles', action: 'Create' }],
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('allows creating a role whose permissions are all already held by the actor', async () => {
      const permissionId = new Types.ObjectId().toString();
      permissionsService.findById.mockResolvedValue({
        resourceType: 'roles',
        action: 'Read',
      } as never);
      repository.create.mockResolvedValue({ name: { en: 'x', ar: 'س' } } as never);

      await service.create({ name: { en: 'x', ar: 'س' }, permissionIds: [permissionId] }, [
        { resourceType: 'roles', action: 'Read' },
      ]);

      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePermissions — privilege escalation prevention', () => {
    it('rejects granting a permission the actor does not hold', async () => {
      const permissionId = new Types.ObjectId();
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: false, archivedAt: null } as never);
      permissionsService.findById.mockResolvedValue({
        resourceType: 'permissions',
        action: 'Create',
      } as never);

      await expect(
        service.updatePermissions(new Types.ObjectId().toString(), [permissionId], [
          { resourceType: 'roles', action: 'Update' },
        ]),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('rejects updating a system role\'s permissions even when every permission is held (isSystemRole gap, P0 #3)', async () => {
      const permissionId = new Types.ObjectId();
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: true, archivedAt: null } as never);

      await expect(
        service.updatePermissions(new Types.ObjectId().toString(), [permissionId], [
          { resourceType: 'roles', action: 'Update' },
        ]),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.updateById).not.toHaveBeenCalled();
      // isSystemRole is checked before permission resolution — no point
      // resolving permissions for an update that's rejected outright.
      expect(permissionsService.findById).not.toHaveBeenCalled();
    });

    it('allows updating a non-system role when every permission is already held', async () => {
      // Grants `roles:Read` alongside `roles:Update` since 2026-09-08: the
      // implied-read rule refuses a role that may edit what it cannot list,
      // so a permission set of `Update` alone is no longer a valid subject
      // for this test. The escalation behaviour under test is unchanged.
      const permissionIds = [new Types.ObjectId(), new Types.ObjectId()];
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: false, archivedAt: null } as never);
      permissionsService.findById
        .mockResolvedValueOnce({ resourceType: 'roles', action: 'Update' } as never)
        .mockResolvedValueOnce({ resourceType: 'roles', action: 'Read' } as never);
      repository.updateById.mockResolvedValue({ permissionIds } as never);

      await service.updatePermissions(new Types.ObjectId().toString(), permissionIds, [
        { resourceType: 'roles', action: 'Update' },
        { resourceType: 'roles', action: 'Read' },
      ]);

      expect(repository.updateById).toHaveBeenCalledTimes(1);
    });
  });

  describe('implied read (owner decision 2026-09-08)', () => {
    /** `findById` is called once per submitted id, in order. */
    const resolvesTo = (...pairs: { resourceType: string; action: string }[]): void => {
      for (const pair of pairs) {
        permissionsService.findById.mockResolvedValueOnce(pair as never);
      }
    };

    const liveRole = (): void => {
      repository.findByIdIncludingArchived.mockResolvedValue({
        isSystemRole: false,
        archivedAt: null,
      } as never);
    };

    /** Holds everything, so only the coherence rule can refuse. */
    const superAdmin = [
      { resourceType: 'athletes', action: 'Delete' },
      { resourceType: 'athletes', action: 'Read' },
      { resourceType: 'newsPage', action: 'Update' },
    ];

    it('refuses a role that may delete a resource it cannot read', async () => {
      liveRole();
      resolvesTo({ resourceType: 'athletes', action: 'Delete' });

      await expect(
        service.updatePermissions(
          new Types.ObjectId().toString(),
          [new Types.ObjectId()],
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('names the permission that would fix it', async () => {
      liveRole();
      resolvesTo({ resourceType: 'athletes', action: 'Delete' });

      const error = await service
        .updatePermissions(new Types.ObjectId().toString(), [new Types.ObjectId()], superAdmin)
        .then(
          () => null,
          (thrown: unknown) => thrown as BadRequestException,
        );

      // The old privilege-escalation refusal names nothing, and an
      // administrator staring at 165 checkboxes cannot act on "invalid".
      expect(error?.getResponse()).toMatchObject({
        code: 'impliedReadMissing',
        missing: ['athletes:Read'],
      });
    });

    it('accepts the same grant once the read is included', async () => {
      liveRole();
      resolvesTo(
        { resourceType: 'athletes', action: 'Delete' },
        { resourceType: 'athletes', action: 'Read' },
      );
      repository.updateById.mockResolvedValue({ permissionIds: [] } as never);

      await service.updatePermissions(
        new Types.ObjectId().toString(),
        [new Types.ObjectId(), new Types.ObjectId()],
        superAdmin,
      );

      expect(repository.updateById).toHaveBeenCalledTimes(1);
    });

    it('accepts a singleton page update, which has no read to imply', async () => {
      liveRole();
      resolvesTo({ resourceType: 'newsPage', action: 'Update' });
      repository.updateById.mockResolvedValue({ permissionIds: [] } as never);

      await service.updatePermissions(
        new Types.ObjectId().toString(),
        [new Types.ObjectId()],
        superAdmin,
      );

      expect(repository.updateById).toHaveBeenCalledTimes(1);
    });

    it('applies the same rule to a new role', async () => {
      resolvesTo({ resourceType: 'athletes', action: 'Delete' });

      await expect(
        service.create(
          {
            name: { en: 'Blind Deleter', ar: 'حاذف أعمى' },
            permissionIds: [new Types.ObjectId().toString()],
          } as never,
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes a role that is not a system role', async () => {
      const id = new Types.ObjectId().toString();
      const archivedBy = new Types.ObjectId();
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: false, archivedAt: null } as never);

      repository.softDelete.mockResolvedValue({ archivedAt: new Date() } as never);

      await service.remove(id, archivedBy);

      expect(repository.softDelete).toHaveBeenCalledWith(id, archivedBy);
    });

    it('rejects deleting a system role', async () => {
      const id = new Types.ObjectId().toString();
      const archivedBy = new Types.ObjectId();
      repository.findByIdIncludingArchived.mockResolvedValue({ isSystemRole: true, archivedAt: null } as never);

      await expect(service.remove(id, archivedBy)).rejects.toThrow(ForbiddenException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
  describe('resolvePermissions', () => {
    /* The read that replaced the JWT's embedded permission set (owner
     * decision 2026-09-07). It now runs on every authenticated request, so
     * these tests care as much about HOW MANY reads it costs as about what
     * it returns: the previous implementation in AuthService issued one
     * findById per permission — 165 round trips for the Super Admin. */

    it('returns nothing, and reads nothing, for a user with no roles', async () => {
      const result = await service.resolvePermissions([]);

      expect(result).toEqual([]);
      expect(repository.findByIds).not.toHaveBeenCalled();
      expect(permissionsService.findByIds).not.toHaveBeenCalled();
    });

    it('flattens role -> permission into {resourceType, action} pairs', async () => {
      const roleId = new Types.ObjectId();
      const permissionId = new Types.ObjectId();
      repository.findByIds.mockResolvedValue([{ permissionIds: [permissionId] }] as never);
      permissionsService.findByIds.mockResolvedValue([
        { resourceType: 'users', action: 'Read' },
      ] as never);

      const result = await service.resolvePermissions([roleId.toString()]);

      expect(result).toEqual([{ resourceType: 'users', action: 'Read' }]);
    });

    it('costs exactly two reads regardless of how many permissions are held', async () => {
      const permissionIds = Array.from({ length: 164 }, () => new Types.ObjectId());
      repository.findByIds.mockResolvedValue([{ permissionIds }] as never);
      permissionsService.findByIds.mockResolvedValue(
        permissionIds.map((_, index) => ({ resourceType: 'users', action: `Action${index}` })) as never,
      );

      await service.resolvePermissions([new Types.ObjectId().toString()]);

      expect(repository.findByIds).toHaveBeenCalledTimes(1);
      expect(permissionsService.findByIds).toHaveBeenCalledTimes(1);
    });

    it('merges two roles into one set, requesting each permission id only once', async () => {
      const shared = new Types.ObjectId();
      const extra = new Types.ObjectId();
      repository.findByIds.mockResolvedValue([
        { permissionIds: [shared] },
        { permissionIds: [shared, extra] },
      ] as never);
      permissionsService.findByIds.mockResolvedValue([
        { resourceType: 'users', action: 'Read' },
        { resourceType: 'roles', action: 'Update' },
      ] as never);

      const result = await service.resolvePermissions([
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ]);

      const [requestedIds] = permissionsService.findByIds.mock.calls[0] as [string[]];
      expect(requestedIds.sort()).toEqual([shared.toString(), extra.toString()].sort());
      expect(result).toHaveLength(2);
    });

    it('collapses the same pair reached through two different roles', async () => {
      repository.findByIds.mockResolvedValue([
        { permissionIds: [new Types.ObjectId()] },
        { permissionIds: [new Types.ObjectId()] },
      ] as never);
      // Two distinct permission documents that describe the same grant.
      permissionsService.findByIds.mockResolvedValue([
        { resourceType: 'users', action: 'Read' },
        { resourceType: 'users', action: 'Read' },
      ] as never);

      const result = await service.resolvePermissions([
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ]);

      expect(result).toEqual([{ resourceType: 'users', action: 'Read' }]);
    });

    it('grants nothing for a role id that no longer resolves', async () => {
      // An archived or deleted role is simply absent from the batch read —
      // it must grant nothing, not throw, so one stale roleId on a user
      // cannot lock them out of routes their other roles still allow.
      repository.findByIds.mockResolvedValue([] as never);

      const result = await service.resolvePermissions([new Types.ObjectId().toString()]);

      expect(result).toEqual([]);
      expect(permissionsService.findByIds).not.toHaveBeenCalled();
    });
  });
});
