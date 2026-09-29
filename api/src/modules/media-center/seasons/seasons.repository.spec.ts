import { Model } from 'mongoose';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { SeasonsRepository } from './seasons.repository.js';
import { dubaiDayRange } from '../../../common/utils/dubai-day-range.util.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

describe('SeasonsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<SeasonDocument>;
  let repository: SeasonsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<SeasonDocument>(Season.name, SeasonSchema);
    await model.ensureIndexes();
    repository = new SeasonsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const base = (overrides: Record<string, unknown> = {}) => ({
    name: { en: 'Season', ar: 'موسم' },
    shortName: 'S',
    about: { en: 'About', ar: 'نبذة' },
    publicationState: 'Draft' as const,
    ...overrides,
  });

  describe('findOverlapping — Dubai calendar days, first and last inclusive', () => {
    /** A Dubai calendar day stored the way the dashboard stores one: its Dubai midnight. */
    const day = (date: string): Date => new Date(`${date}T00:00:00+04:00`);
    const days = (first: string, last: string) => dubaiDayRange(day(first), day(last));

    const existing = () =>
      repository.create({
        ...base(),
        slug: 'existing',
        startDate: day('2026-09-01'),
        endDate: day('2027-08-31'),
      });

    it('finds a season whose range intersects an existing one from the left', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2026-06-01', '2026-10-01'));

      expect(found.map((s) => s.slug)).toEqual(['existing']);
    });

    it('finds a season whose range intersects an existing one from the right', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2027-06-01', '2027-12-01'));

      expect(found.map((s) => s.slug)).toEqual(['existing']);
    });

    it('finds a range starting on the existing season last day — that day belongs to both', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2027-08-31', '2028-08-31'));

      expect(found.map((s) => s.slug)).toEqual(['existing']);
    });

    it('finds a range ending on the existing season first day', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2025-09-01', '2026-09-01'));

      expect(found.map((s) => s.slug)).toEqual(['existing']);
    });

    it('does not treat a season starting the day after another ends as overlapping', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2027-09-01', '2028-08-31'));

      expect(found).toEqual([]);
    });

    it('does not treat a season ending the day before another starts as overlapping', async () => {
      await existing();

      const found = await repository.findOverlapping(days('2025-09-01', '2026-08-31'));

      expect(found).toEqual([]);
    });

    it('excludes the given id, so an update does not collide with itself', async () => {
      const season = await existing();

      const found = await repository.findOverlapping(
        dubaiDayRange(season.startDate, season.endDate),
        season._id.toString(),
      );

      expect(found).toEqual([]);
    });

    it('still finds a different season the update would overlap, even while excluding itself', async () => {
      const season = await existing();
      await repository.create({
        ...base(),
        slug: 'third',
        startDate: day('2026-11-01'),
        endDate: day('2027-10-31'),
      });

      const found = await repository.findOverlapping(days('2026-10-01', '2027-09-30'), season._id.toString());

      expect(found.map((s) => s.slug)).toEqual(['third']);
    });

    it('ignores an archived season', async () => {
      const season = await existing();
      await model.updateOne({ _id: season._id }, { archivedAt: new Date() });

      const found = await repository.findOverlapping(dubaiDayRange(season.startDate, season.endDate));

      expect(found).toEqual([]);
    });
  });

});
