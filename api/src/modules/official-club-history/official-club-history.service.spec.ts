import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialClubHistoryService } from './official-club-history.service.js';
import { OfficialClubHistoryRepository } from './official-club-history.repository.js';

describe('OfficialClubHistoryService', () => {
  const makeRepository = () =>
    ({
      findCurrent: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<OfficialClubHistoryRepository>;

  const officialId = new Types.ObjectId().toString();
  const clubId = new Types.ObjectId().toString();

  describe('create', () => {
    it('creates a current row directly when the official has no existing current club', async () => {
      const repository = makeRepository();
      repository.findCurrent.mockResolvedValue(null);
      repository.create.mockResolvedValue({ endDate: null } as never);
      const service = new OfficialClubHistoryService(repository);

      await service.create({ officialId, clubId, startDate: '2026-01-01' });

      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: new Date('2026-01-01'), endDate: null }),
      );
    });

    it('closes out the official\'s existing current row on transferDate before creating the new one', async () => {
      const repository = makeRepository();
      const currentRowId = new Types.ObjectId();
      repository.findCurrent.mockResolvedValue({ _id: currentRowId } as never);
      repository.create.mockResolvedValue({ endDate: null } as never);
      const service = new OfficialClubHistoryService(repository);

      await service.create({
        officialId,
        clubId,
        startDate: '2026-01-01',
        transferDate: '2025-12-31',
      });

      expect(repository.updateById).toHaveBeenCalledWith(currentRowId.toString(), {
        endDate: new Date('2025-12-31'),
      });
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ endDate: null }));
    });

    it('does not touch an existing current row when the new row is created already-historical (explicit endDate)', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new OfficialClubHistoryService(repository);

      await service.create({
        officialId,
        clubId,
        startDate: '2020-01-01',
        endDate: '2021-01-01',
      });

      expect(repository.findCurrent).not.toHaveBeenCalled();
      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });

  describe('endCurrent', () => {
    it('sets endDate on the current row without creating a replacement', async () => {
      const repository = makeRepository();
      const currentRowId = new Types.ObjectId();
      repository.findCurrent.mockResolvedValue({ _id: currentRowId } as never);
      repository.updateById.mockResolvedValue({ endDate: new Date('2026-02-01') } as never);
      const service = new OfficialClubHistoryService(repository);

      await service.endCurrent(officialId, { endDate: '2026-02-01' });

      expect(repository.updateById).toHaveBeenCalledWith(currentRowId.toString(), {
        endDate: new Date('2026-02-01'),
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the official has no current club relationship', async () => {
      const repository = makeRepository();
      repository.findCurrent.mockResolvedValue(null);
      const service = new OfficialClubHistoryService(repository);

      await expect(service.endCurrent(officialId, {})).rejects.toThrow(NotFoundException);
    });
  });
});
