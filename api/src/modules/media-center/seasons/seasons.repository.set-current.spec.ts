import mongoose from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { SeasonsRepository } from './seasons.repository.js';
import { registerTestModel } from '../../../../test/utils/mongo-memory-server.js';

// Transactions need a replica set; the shared standalone helper cannot run
// them — same reason `roles.remove.transaction.spec.ts` stands up its own.
const LAUNCH_TIMEOUT_MS = 25_000;

describe('SeasonsRepository.setCurrent — one transaction, exactly one current season', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let model: Model<SeasonDocument>;
  let repository: SeasonsRepository;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: LAUNCH_TIMEOUT_MS }],
    });
    connection = await mongoose.createConnection(replSet.getUri()).asPromise();
    model = registerTestModel<SeasonDocument>(Season.name, SeasonSchema, connection);
    await model.init();
    repository = new SeasonsRepository(model);
  }, 60_000);

  afterEach(async () => {
    await model.deleteMany({});
  });

  afterAll(async () => {
    await connection?.close();
    await replSet?.stop();
  });

  const base = (overrides: Record<string, unknown> = {}) => ({
    name: { en: 'Season', ar: 'موسم' },
    shortName: 'S',
    about: { en: 'About', ar: 'نبذة' },
    publicationState: 'Draft' as const,
    ...overrides,
  });

  it('clears the previous holder and sets the new one, leaving exactly one', async () => {
    const first = await repository.create({
      ...base(),
      slug: 'first',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-09-01'),
      isCurrent: true,
    });
    const second = await repository.create({
      ...base(),
      slug: 'second',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-09-01'),
      isCurrent: false,
    });

    await repository.setCurrent(second._id.toString());

    const currents = await model.find({ isCurrent: true }).exec();
    expect(currents.map((s) => s.slug)).toEqual(['second']);
    const refreshedFirst = await model.findById(first._id).exec();
    expect(refreshedFirst?.isCurrent).toBe(false);
  });

  it('rolls back the clear when the target id does not resolve, leaving the original holder current', async () => {
    const first = await repository.create({
      ...base(),
      slug: 'first',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-09-01'),
      isCurrent: true,
    });

    const result = await repository.setCurrent('000000000000000000000000');

    expect(result).toBeNull();
    const currents = await model.find({ isCurrent: true }).exec();
    expect(currents.map((s) => s.slug)).toEqual(['first']);
    const refreshedFirst = await model.findById(first._id).exec();
    expect(refreshedFirst?.isCurrent).toBe(true);
  });
});
