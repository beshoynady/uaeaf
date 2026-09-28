import { jest } from '@jest/globals';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RoleSchema } from './schemas/role.schema.js';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RenameRoleDto } from './dto/rename-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

// The options `main.ts` registers globally; the rejection tests depend on them.
const globalPipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

const NAME = { en: 'Editor', ar: 'محرر' };

describe('Role.templateKey (ADR-0113)', () => {
  describe('schema', () => {
    it('is an optional string with no default, so rows without it stay without it', () => {
      const path = RoleSchema.path('templateKey');

      expect(path).toBeDefined();
      expect(path.instance).toBe('String');
      expect(path.options.required).toBeFalsy();
      // A default of null would put every hand-made role into the unique index.
      expect(path.options.default).toBeUndefined();
    });

    it('is unique and sparse, so any number of roles may lack it', () => {
      const indexes = RoleSchema.indexes() as [Record<string, number>, Record<string, unknown>][];
      const index = indexes.find(([keys]) => 'templateKey' in keys);

      expect(index).toBeDefined();
      expect(index?.[0]).toEqual({ templateKey: 1 });
      expect(index?.[1]).toMatchObject({ unique: true, sparse: true });
    });
  });

  describe('no request body can write it', () => {
    it.each([
      ['CreateRoleDto', CreateRoleDto, { name: NAME, permissionIds: [] }],
      ['RenameRoleDto', RenameRoleDto, { name: NAME }],
      ['UpdateRolePermissionsDto', UpdateRolePermissionsDto, { permissionIds: [] }],
    ])('%s refuses a body carrying templateKey', async (_label, metatype, body) => {
      await expect(
        globalPipe.transform({ ...body, templateKey: 'editor' }, { type: 'body', metatype }),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      ['CreateRoleDto', CreateRoleDto, { name: NAME, permissionIds: [] }],
      ['RenameRoleDto', RenameRoleDto, { name: NAME }],
      ['UpdateRolePermissionsDto', UpdateRolePermissionsDto, { permissionIds: [] }],
    ])('%s accepts the same body without it', async (_label, metatype, body) => {
      await expect(globalPipe.transform(body, { type: 'body', metatype })).resolves.toBeDefined();
    });
  });

  describe('no service path writes it, even when handed one', () => {
    let service: RolesService;
    let repository: {
      create: jest.Mock<(data: unknown) => Promise<unknown>>;
      findByIds: jest.Mock<() => Promise<unknown[]>>;
      findByIdIncludingArchived: jest.Mock<() => Promise<unknown>>;
      updateById: jest.Mock<(id: string, update: unknown) => Promise<unknown>>;
    };

    beforeEach(async () => {
      repository = {
        create: jest.fn(async (data: unknown) => data),
        findByIds: jest.fn(async () => []),
        findByIdIncludingArchived: jest.fn(async () => ({
          isSystemRole: false,
          archivedAt: null,
          templateKey: 'editor',
        })),
        updateById: jest.fn(async (_id: string, update: unknown) => update),
      };
      const module = await Test.createTestingModule({
        providers: [
          RolesService,
          { provide: RolesRepository, useValue: repository },
          { provide: RoleAssignmentsRepository, useValue: { detachRole: jest.fn() } },
          { provide: PermissionsService, useValue: { findById: jest.fn(), findByIds: jest.fn() } },
        ],
      }).compile();
      service = module.get(RolesService);
    });

    it('create stores no templateKey from the body', async () => {
      const dto = { name: NAME, permissionIds: [], templateKey: 'editor' } as CreateRoleDto;

      await service.create(dto, []);

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create.mock.calls[0][0]).not.toHaveProperty('templateKey');
    });

    it('rename leaves templateKey out of the update', async () => {
      const id = new Types.ObjectId().toString();
      const dto = { name: NAME, templateKey: 'reviewer-approver' } as RenameRoleDto;

      await service.rename(id, dto.name, dto.description);

      expect(repository.updateById.mock.calls[0][1]).not.toHaveProperty('templateKey');
    });

    it('updatePermissions leaves templateKey out of the update', async () => {
      const id = new Types.ObjectId().toString();

      await service.updatePermissions(id, [], []);

      expect(repository.updateById.mock.calls[0][1]).not.toHaveProperty('templateKey');
    });
  });
});
