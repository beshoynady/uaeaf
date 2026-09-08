import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';

/**
 * Covers the three defects found on 2026-09-08 while building the roles
 * screen (build-plan open items 21 and 22):
 *
 * - a write against an id that resolves to nothing answered 200 with an
 *   empty body instead of 404;
 * - `assertNotSystemRole` read through `findById`, which filters
 *   `archivedAt: null`, so an ARCHIVED system role was not recognised as
 *   one and could be renamed;
 * - archiving a role left its id on every user who held it, with nothing
 *   anywhere clearing it.
 */
describe('RolesService — lifecycle guards', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;
  let assignments: jest.Mocked<RoleAssignmentsRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;

  const id = new Types.ObjectId().toString();
  const actor = new Types.ObjectId();
  const name = { en: 'Content Editor', ar: 'محرّر المحتوى' };

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
        { provide: PermissionsService, useValue: { findById: jest.fn(), findByIds: jest.fn() } },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = module.get(RolesRepository);
    assignments = module.get(RoleAssignmentsRepository);
    permissionsService = module.get(PermissionsService);
  });

  const stored = (over: Record<string, unknown> = {}) =>
    ({ _id: new Types.ObjectId(id), name, isSystemRole: false, archivedAt: null, ...over }) as never;

  describe('rename', () => {
    it('reports an id that matches no role as not found, not as a silent success', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(null);

      await expect(service.rename(id, name)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses to rename an archived role', async () => {
      // `findById` filters archived rows, so the previous guard saw `null`
      // here and fell through to the update — which then renamed a deleted
      // role, and did so even when it was a system role.
      repository.findByIdIncludingArchived.mockResolvedValue(stored({ archivedAt: new Date() }));

      await expect(service.rename(id, name)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses to rename an archived SYSTEM role', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(
        stored({ archivedAt: new Date(), isSystemRole: true }),
      );

      await expect(service.rename(id, name)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('still refuses a live system role, with the forbidden it always gave', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(stored({ isSystemRole: true }));

      await expect(service.rename(id, name)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('renames a live custom role', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(stored());
      repository.updateById.mockResolvedValue(stored({ name }));

      await expect(service.rename(id, name)).resolves.toMatchObject({ name });
      expect(repository.updateById).toHaveBeenCalledWith(id, { name });
    });
  });

  describe('updatePermissions', () => {
    it('reports an unknown id as not found', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(null);

      await expect(service.updatePermissions(id, [], [])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an archived role', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(stored({ archivedAt: new Date() }));

      await expect(service.updatePermissions(id, [], [])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('checks the system-role flag before the grantable check, as it always did', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(stored({ isSystemRole: true }));

      await expect(service.updatePermissions(id, [], [])).rejects.toBeInstanceOf(ForbiddenException);
      expect(permissionsService.findById).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('reports an unknown id as not found', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(null);

      await expect(service.remove(id, actor)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('refuses to re-archive an already archived role', async () => {
      repository.findByIdIncludingArchived.mockResolvedValue(stored({ archivedAt: new Date() }));

      await expect(service.remove(id, actor)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('clears the role from everyone holding it, after archiving it', async () => {
      // Archiving stops the role granting immediately, because permission
      // resolution filters archived rows. What it did NOT do was remove the
      // id from `users.roleIds`, so every holder kept a dangling reference
      // that no screen could explain.
      repository.findByIdIncludingArchived.mockResolvedValue(stored());
      repository.softDelete.mockResolvedValue(stored({ archivedAt: new Date() }));
      assignments.detachRole.mockResolvedValue(3);

      const result = await service.remove(id, actor);

      expect(repository.softDelete).toHaveBeenCalledWith(id, actor);
      expect(assignments.detachRole).toHaveBeenCalledWith(id);
      expect(result).toMatchObject({ archivedAt: expect.any(Date) });
    });

    it('does not detach when the archive itself did not happen', async () => {
      // Order matters: detaching first would strip the role from every user
      // and then leave it live if the archive failed.
      repository.findByIdIncludingArchived.mockResolvedValue(stored());
      repository.softDelete.mockResolvedValue(null);

      await expect(service.remove(id, actor)).rejects.toBeInstanceOf(NotFoundException);
      expect(assignments.detachRole).not.toHaveBeenCalled();
    });
  });

  describe('assertAssignable', () => {
    it('accepts an empty list — removing every role from an account is legitimate', async () => {
      await expect(service.assertAssignable([])).resolves.toBeUndefined();
      expect(repository.findByIds).not.toHaveBeenCalled();
    });

    it('accepts ids that all resolve to live roles', async () => {
      const other = new Types.ObjectId().toString();
      repository.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(id) },
        { _id: new Types.ObjectId(other) },
      ] as never);

      await expect(service.assertAssignable([id, other])).resolves.toBeUndefined();
    });

    it('rejects an id that resolves to nothing, and names it', async () => {
      // `@IsMongoId` validates the shape only. A well-formed id for a role
      // that never existed, or was archived, used to be stored silently and
      // simply granted nothing.
      const ghost = new Types.ObjectId().toString();
      repository.findByIds.mockResolvedValue([{ _id: new Types.ObjectId(id) }] as never);

      const error = await service.assertAssignable([id, ghost]).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify((error as BadRequestException).getResponse())).toContain(ghost);
    });

    it('deduplicates before reporting, so one bad id is named once', async () => {
      const ghost = new Types.ObjectId().toString();
      repository.findByIds.mockResolvedValue([] as never);

      const error = await service.assertAssignable([ghost, ghost]).catch((caught: unknown) => caught);
      const body = JSON.stringify((error as BadRequestException).getResponse());

      expect(body.split(ghost).length - 1).toBe(1);
    });
  });
});

/**
 * Editing a role's description.
 *
 * `description` was added to the schema on 2026-09-07 with an explicit
 * reason — a name like "News Approver" does not tell an administrator handing
 * out access what the role actually permits, which is exactly the moment a
 * wrong grant happens. It was accepted at creation and by nothing else, so a
 * description written with a mistake in it could only be corrected by
 * deleting the role and rebuilding it.
 */
describe('RolesService.rename — description', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;

  const id = new Types.ObjectId().toString();
  const name = { en: 'Content Editor', ar: 'محرّر المحتوى' };
  const description = { en: 'Writes and edits news.', ar: 'يكتب الأخبار ويحرّرها.' };

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
    repository.findByIdIncludingArchived.mockResolvedValue({
      _id: new Types.ObjectId(id),
      isSystemRole: false,
      archivedAt: null,
    } as never);
    repository.updateById.mockResolvedValue({ _id: new Types.ObjectId(id) } as never);
  });

  it('writes the description alongside the name', async () => {
    await service.rename(id, name, description);

    expect(repository.updateById).toHaveBeenCalledWith(id, { name, description });
  });

  it('leaves an existing description untouched when none is sent', async () => {
    // Omitted means unchanged. Writing `undefined` into the update would
    // clear a description the caller never mentioned.
    await service.rename(id, name);

    expect(repository.updateById).toHaveBeenCalledWith(id, { name });
  });

  it('clears the description when it is explicitly null', async () => {
    // The only way to remove one. Distinct from omitting it.
    await service.rename(id, name, null);

    expect(repository.updateById).toHaveBeenCalledWith(id, { name, description: null });
  });

  it('still refuses a system role', async () => {
    repository.findByIdIncludingArchived.mockResolvedValue({
      _id: new Types.ObjectId(id),
      isSystemRole: true,
      archivedAt: null,
    } as never);

    await expect(service.rename(id, name, description)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateById).not.toHaveBeenCalled();
  });
});
