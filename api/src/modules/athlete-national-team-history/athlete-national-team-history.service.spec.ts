import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { AthleteNationalTeamHistoryService } from './athlete-national-team-history.service.js';
import { AthleteNationalTeamHistoryRepository } from './athlete-national-team-history.repository.js';

describe('AthleteNationalTeamHistoryService', () => {
  const makeRepository = () =>
    ({ findCurrent: jest.fn(), create: jest.fn() }) as unknown as jest.Mocked<AthleteNationalTeamHistoryRepository>;

  describe('isCurrentlyOnNationalTeam', () => {
    it('returns true when a row with endDate: null exists for the athlete', async () => {
      const repository = makeRepository();
      const athleteId = new Types.ObjectId().toString();
      repository.findCurrent.mockResolvedValue({ endDate: null } as never);
      const service = new AthleteNationalTeamHistoryService(repository);

      await expect(service.isCurrentlyOnNationalTeam(athleteId)).resolves.toBe(true);
    });

    it('returns false when no row with endDate: null exists for the athlete', async () => {
      const repository = makeRepository();
      const athleteId = new Types.ObjectId().toString();
      repository.findCurrent.mockResolvedValue(null);
      const service = new AthleteNationalTeamHistoryService(repository);

      await expect(service.isCurrentlyOnNationalTeam(athleteId)).resolves.toBe(false);
    });
  });
});
