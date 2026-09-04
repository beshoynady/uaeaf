import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthletesService } from './athletes.service.js';
import { AthletesRepository } from './athletes.repository.js';

describe('AthletesService', () => {
  const makeRepository = () =>
    ({ findById: jest.fn(), findPaginated: jest.fn() }) as unknown as jest.Mocked<AthletesRepository>;

  describe('getDisciplineIds', () => {
    it('returns the athlete disciplineIds', async () => {
      const repository = makeRepository();
      const disciplineIds = [new Types.ObjectId()];
      repository.findById.mockResolvedValue({ disciplineIds } as never);
      const service = new AthletesService(repository);

      await expect(service.getDisciplineIds('athlete-1')).resolves.toBe(disciplineIds);
    });

    it('throws NotFoundException when the athlete does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = new AthletesService(repository);

      await expect(service.getDisciplineIds('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toPublicResponse', () => {
    it('excludes dateOfBirth from the mapped shape', () => {
      const repository = makeRepository();
      const service = new AthletesService(repository);
      const athlete = {
        _id: new Types.ObjectId(),
        name: { en: 'Jane', ar: 'جين' },
        dateOfBirth: new Date('2000-01-01'),
        nationalityId: new Types.ObjectId(),
        disciplineIds: [new Types.ObjectId()],
        gender: 'Female',
        residencyType: 'Local',
        federationName: null,
      };

      const result = service.toPublicResponse(athlete as never);

      expect(result).not.toHaveProperty('dateOfBirth');
      expect(result.id).toBe(athlete._id.toString());
      expect(result.gender).toBe('Female');
    });
  });

  describe('findAllPublic', () => {
    it('maps each item through toPublicResponse and passes through page/limit/total', async () => {
      const repository = makeRepository();
      const athlete = {
        _id: new Types.ObjectId(),
        name: { en: 'Jane', ar: 'جين' },
        dateOfBirth: new Date('2000-01-01'),
        nationalityId: new Types.ObjectId(),
        disciplineIds: [],
        gender: 'Female',
        residencyType: 'Local',
        federationName: null,
      };
      repository.findPaginated.mockResolvedValue({ items: [athlete] as never, total: 1 });
      const service = new AthletesService(repository);

      const result = await service.findAllPublic(2, 10);

      expect(repository.findPaginated).toHaveBeenCalledWith(10, 10);
      expect(result).toEqual({
        items: [service.toPublicResponse(athlete as never)],
        total: 1,
        page: 2,
        limit: 10,
      });
      expect(result.items[0]).not.toHaveProperty('dateOfBirth');
    });

    it('defaults to page 1 / limit 50 when not provided', async () => {
      const repository = makeRepository();
      repository.findPaginated.mockResolvedValue({ items: [], total: 0 });
      const service = new AthletesService(repository);

      await service.findAllPublic();

      expect(repository.findPaginated).toHaveBeenCalledWith(0, 50);
    });
  });
});
