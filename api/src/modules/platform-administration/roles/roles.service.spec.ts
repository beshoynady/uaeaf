import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
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
            updateById: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            findById: jest.fn(),
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
      repository.findById.mockResolvedValue({ isSystemRole: false } as never);
      repository.updateById.mockResolvedValue({ name } as never);

      const result = await service.rename(id, name);

      expect(repository.updateById).toHaveBeenCalledWith(id, { name });
      expect(result).toEqual({ name });
    });

    it('rejects renaming a system role', async () => {
      const id = new Types.ObjectId().toString();
      repository.findById.mockResolvedValue({ isSystemRole: true } as never);

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
      repository.findById.mockResolvedValue({ isSystemRole: false } as never);
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
      repository.findById.mockResolvedValue({ isSystemRole: true } as never);

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
      const permissionId = new Types.ObjectId();
      repository.findById.mockResolvedValue({ isSystemRole: false } as never);
      permissionsService.findById.mockResolvedValue({
        resourceType: 'roles',
        action: 'Update',
      } as never);
      repository.updateById.mockResolvedValue({ permissionIds: [permissionId] } as never);

      await service.updatePermissions(new Types.ObjectId().toString(), [permissionId], [
        { resourceType: 'roles', action: 'Update' },
      ]);

      expect(repository.updateById).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes a role that is not a system role', async () => {
      const id = new Types.ObjectId().toString();
      const archivedBy = new Types.ObjectId();
      repository.findById.mockResolvedValue({ isSystemRole: false } as never);

      await service.remove(id, archivedBy);

      expect(repository.softDelete).toHaveBeenCalledWith(id, archivedBy);
    });

    it('rejects deleting a system role', async () => {
      const id = new Types.ObjectId().toString();
      const archivedBy = new Types.ObjectId();
      repository.findById.mockResolvedValue({ isSystemRole: true } as never);

      await expect(service.remove(id, archivedBy)).rejects.toThrow(ForbiddenException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
