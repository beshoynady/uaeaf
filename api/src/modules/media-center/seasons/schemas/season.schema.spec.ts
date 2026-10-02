import { Model } from 'mongoose';
import { Season, SeasonSchema } from './season.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { SeasonDocument } from './season.schema.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../../test/utils/mongo-memory-server.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

describe('Season schema', () => {
  let server: MongoMemoryServer;
  let SeasonModel: Model<SeasonDocument>;

  beforeAll(async () => {
    server = await connectTestDatabase();
    SeasonModel = registerTestModel<SeasonDocument>(Season.name, SeasonSchema);
    await SeasonModel.ensureIndexes();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const base = (overrides: Record<string, unknown> = {}) => ({
    name: { en: 'Season 2026-2027', ar: 'موسم 2026-2027' },
    shortName: '26/27',
    about: { en: 'About', ar: 'نبذة' },
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2027-08-31T23:59:59.999Z'),
    publicationState: 'Draft' as const,
    ...overrides,
  });

  it('rejects a second season with the same slug while both are live', async () => {
    await SeasonModel.create({ ...base(), slug: '2026-2027' });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027' })).rejects.toThrow();
  });

  it('allows a re-created slug once the original is archived', async () => {
    const original = await SeasonModel.create({ ...base(), slug: '2026-2027' });
    await SeasonModel.updateOne({ _id: original._id }, { archivedAt: new Date() });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027' })).resolves.toBeDefined();
  });

  it('rejects a second isCurrent:true season', async () => {
    await SeasonModel.create({ ...base(), slug: '2025-2026', isCurrent: true });
    await expect(SeasonModel.create({ ...base(), slug: '2026-2027', isCurrent: true })).rejects.toThrow();
  });

  it('allows any number of isCurrent:false seasons', async () => {
    await SeasonModel.create({ ...base(), slug: '2024-2025', isCurrent: false });
    await expect(SeasonModel.create({ ...base(), slug: '2025-2026', isCurrent: false })).resolves.toBeDefined();
  });

  /**
   * A season is a publication entity type, so `PublishingService` is what
   * moves it — and that writes the platform's words and the platform's date
   * field. A schema spelling either of them differently accepts the write
   * (an `updateOne` runs no enum validator) and then fails to be read back.
   */
  it('speaks the platform publication vocabulary', () => {
    expect(SeasonSchema.path('publicationState').options.enum).toEqual(PUBLICATION_STATES);
  });

  it('carries the publish date under the name the publishing path writes', () => {
    expect(SeasonSchema.path('publishDate')).toBeDefined();
    expect(SeasonSchema.path('publishedAt')).toBeUndefined();
  });

  it('stores a live season the schema itself accepts', async () => {
    const live = await SeasonModel.create({ ...base(), slug: 'live', publicationState: 'Live' });

    await expect(live.validate()).resolves.toBeUndefined();
  });
});
