import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClubsService } from './clubs.service.js';
import { ClubsRepository } from './clubs.repository.js';
import type { CreateClubDto } from './dto/create-club.dto.js';

describe('ClubsService', () => {
  const dto: CreateClubDto = {
    name: { en: 'Al Wasl SC', ar: 'نادي الوصل' },
    slug: 'al-wasl-sc',
    foundingDate: '1960-01-01',
    emirateId: new Types.ObjectId().toString(),
    registrationNumber: 'CLUB-REG-1',
    clubType: 'SportsClub',
    status: 'Active',
  };

  const makeRepository = () =>
    ({ create: jest.fn(), find: jest.fn(), findById: jest.fn(), softDelete: jest.fn() }) as unknown as jest.Mocked<ClubsRepository>;

  describe('create', () => {
    /** registrationNumber uniqueness added schema-audit-2026-09-04.md
     *  §3.3/§9.5 (P1 finding) — verifies the duplicate-key error path is
     *  wired through the same shared E11000 handler used by
     *  athleteProfiles/officialProfiles/albums. */
    it('throws ConflictException when the repository reports a duplicate registrationNumber', async () => {
      const repository = makeRepository();
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { registrationNumber: 'CLUB-REG-1' } }),
      );
      const service = new ClubsService(repository);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the repository reports a duplicate slug', async () => {
      const repository = makeRepository();
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { slug: 'al-wasl-sc' } }),
      );
      const service = new ClubsService(repository);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('re-throws a non-duplicate-key error unchanged', async () => {
      const repository = makeRepository();
      const otherError = new Error('connection reset');
      repository.create.mockRejectedValue(otherError);
      const service = new ClubsService(repository);

      await expect(service.create(dto)).rejects.toThrow(otherError);
    });

    it('creates the club when no conflict occurs', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = new ClubsService(repository);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ registrationNumber: 'CLUB-REG-1', slug: 'al-wasl-sc' }),
      );
    });
  });
});
