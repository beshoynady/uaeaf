import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteClubHistoryService } from './athlete-club-history.service.js';
import { AthleteClubHistoryRepository } from './athlete-club-history.repository.js';

describe('AthleteClubHistoryService', () => {
  const makeRepository = () =>
    ({
      findCurrent: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<AthleteClubHistoryRepository>;

  const athleteId = new Types.ObjectId().toString();
  const clubId = new Types.ObjectId().toString();

  describe('create', () => {
    it('creates a current row directly when the athlete has no existing current club', async () => {
      const repository = makeRepository();
      repository.findCurrent.mockResolvedValue(null);
      repository.create.mockResolvedValue({ endDate: null } as never);
      const service = new AthleteClubHistoryService(repository);

      await service.create({ athleteId, clubId, startDate: '2026-01-01' });

      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: new Date('2026-01-01'), endDate: null }),
      );
    });

    it('closes out the athlete\'s existing current row on transferDate before creating the new one', async () => {
      const repository = makeRepository();
      const currentRowId = new Types.ObjectId();
      repository.findCurrent.mockResolvedValue({ _id: currentRowId } as never);
      repository.create.mockResolvedValue({ endDate: null } as never);
      const service = new AthleteClubHistoryService(repository);

      await service.create({
        athleteId,
        clubId,
        startDate: '2026-01-01',
        transferDate: '2025-12-31',
      });

      expect(repository.updateById).toHaveBeenCalledWith(currentRowId.toString(), {
        endDate: new Date('2025-12-31'),
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: null }),
      );
    });

    it('defaults the closed-out endDate to now when transferDate is omitted', async () => {
      const repository = makeRepository();
      const currentRowId = new Types.ObjectId();
      repository.findCurrent.mockResolvedValue({ _id: currentRowId } as never);
      repository.create.mockResolvedValue({ endDate: null } as never);
      const service = new AthleteClubHistoryService(repository);

      await service.create({ athleteId, clubId, startDate: '2026-01-01' });

      expect(repository.updateById).toHaveBeenCalledWith(currentRowId.toString(), {
        endDate: expect.any(Date),
      });
    });

    it('does not touch an existing current row when the new row is created already-historical (explicit endDate)', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new AthleteClubHistoryService(repository);

      await service.create({
        athleteId,
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
      const service = new AthleteClubHistoryService(repository);

      await service.endCurrent(athleteId, { endDate: '2026-02-01' });

      expect(repository.updateById).toHaveBeenCalledWith(currentRowId.toString(), {
        endDate: new Date('2026-02-01'),
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the athlete has no current club relationship', async () => {
      const repository = makeRepository();
      repository.findCurrent.mockResolvedValue(null);
      const service = new AthleteClubHistoryService(repository);

      await expect(service.endCurrent(athleteId, {})).rejects.toThrow(NotFoundException);
    });
  });
});
