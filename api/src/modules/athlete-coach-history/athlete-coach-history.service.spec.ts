import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { AthleteCoachHistoryService } from './athlete-coach-history.service.js';
import { AthleteCoachHistoryRepository } from './athlete-coach-history.repository.js';

describe('AthleteCoachHistoryService', () => {
  const makeRepository = () =>
    ({ findCurrent: jest.fn(), create: jest.fn() }) as unknown as jest.Mocked<AthleteCoachHistoryRepository>;

  describe('getCurrentCoach', () => {
    it('returns the row with endDate: null when the athlete has a current coach', async () => {
      const repository = makeRepository();
      const athleteId = new Types.ObjectId().toString();
      const currentRow = { coachId: new Types.ObjectId(), endDate: null };
      repository.findCurrent.mockResolvedValue(currentRow as never);
      const service = new AthleteCoachHistoryService(repository);

      const result = await service.getCurrentCoach(athleteId);

      expect(repository.findCurrent).toHaveBeenCalledWith(expect.any(Types.ObjectId));
      expect(result).toBe(currentRow);
    });

    it('returns null when the athlete has no row with endDate: null (no current coach)', async () => {
      const repository = makeRepository();
      const athleteId = new Types.ObjectId().toString();
      repository.findCurrent.mockResolvedValue(null);
      const service = new AthleteCoachHistoryService(repository);

      await expect(service.getCurrentCoach(athleteId)).resolves.toBeNull();
    });
  });
});
