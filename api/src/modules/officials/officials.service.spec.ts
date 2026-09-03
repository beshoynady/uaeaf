import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialsService } from './officials.service.js';
import { OfficialsRepository } from './officials.repository.js';

describe('OfficialsService', () => {
  const makeRepository = () =>
    ({ findById: jest.fn() }) as unknown as jest.Mocked<OfficialsRepository>;

  describe('getDisciplineIds', () => {
    it('returns the official disciplineIds', async () => {
      const repository = makeRepository();
      const disciplineIds = [new Types.ObjectId()];
      repository.findById.mockResolvedValue({ disciplineIds } as never);
      const service = new OfficialsService(repository);

      await expect(service.getDisciplineIds('official-1')).resolves.toBe(disciplineIds);
    });

    it('throws NotFoundException when the official does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = new OfficialsService(repository);

      await expect(service.getDisciplineIds('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toPublicResponse', () => {
    it('maps the full public-safe shape', () => {
      const repository = makeRepository();
      const service = new OfficialsService(repository);
      const official = {
        _id: new Types.ObjectId(),
        fullName: { en: 'John', ar: 'جون' },
        roleType: 'Referee',
        licenseLevel: 'Level1',
        disciplineIds: [new Types.ObjectId()],
        nationalityId: new Types.ObjectId(),
        residencyType: 'Local',
        federationName: null,
      };

      const result = service.toPublicResponse(official as never);

      expect(result.id).toBe(official._id.toString());
      expect(result.roleType).toBe('Referee');
    });
  });
});
