import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoachesService } from './coaches.service.js';
import { CoachesRepository } from './coaches.repository.js';
import type { CreateCoachDto } from './dto/create-coach.dto.js';

describe('CoachesService', () => {
  const dto: CreateCoachDto = {
    fullName: { en: 'Ahmed Hassan', ar: 'أحمد حسن' },
    slug: 'ahmed-hassan',
    licenseLevel: 'Level1',
    registrationNumber: 'COACH-REG-1',
    nationalityId: new Types.ObjectId().toString(),
    gender: 'Male',
    status: 'Active',
  };

  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn(), findById: jest.fn(), softDelete: jest.fn() }) as unknown as jest.Mocked<CoachesRepository>;

  describe('create', () => {
    /** registrationNumber uniqueness added schema-audit-2026-09-04.md
     *  §3.3/§9.5 (P1 finding) — verifies the duplicate-key error path is
     *  wired through the same shared E11000 handler used by
     *  athleteProfiles/officialProfiles/albums. */
    it('throws ConflictException when the repository reports a duplicate registrationNumber', async () => {
      const repository = makeRepository();
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { registrationNumber: 'COACH-REG-1' } }),
      );
      const service = new CoachesService(repository);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the repository reports a duplicate slug', async () => {
      const repository = makeRepository();
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { slug: 'ahmed-hassan' } }),
      );
      const service = new CoachesService(repository);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('re-throws a non-duplicate-key error unchanged', async () => {
      const repository = makeRepository();
      const otherError = new Error('connection reset');
      repository.create.mockRejectedValue(otherError);
      const service = new CoachesService(repository);

      await expect(service.create(dto)).rejects.toThrow(otherError);
    });

    it('creates the coach when no conflict occurs', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = new CoachesService(repository);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ registrationNumber: 'COACH-REG-1', slug: 'ahmed-hassan' }),
      );
    });
  });
});
