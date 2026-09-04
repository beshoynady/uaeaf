import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';

describe('RolesService', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            findById: jest.fn(),
            updateById: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = module.get(RolesRepository);
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
