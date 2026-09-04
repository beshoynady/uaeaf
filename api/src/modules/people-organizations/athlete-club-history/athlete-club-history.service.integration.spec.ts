import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AthleteClubHistorySchema } from './schemas/athlete-club-history.schema.js';
import type { AthleteClubHistoryDocument } from './schemas/athlete-club-history.schema.js';
import { AthleteClubHistoryRepository } from './athlete-club-history.repository.js';
import { AthleteClubHistoryService } from './athlete-club-history.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

/** Confirms the 2026-09-02 correction against a real database: creating a
 *  second current club row for the same athlete closes out the first with
 *  a real `endDate` rather than leaving two `endDate: null` rows. */
describe('AthleteClubHistoryService (integration)', () => {
  let server: MongoMemoryServer;
  let model: Model<AthleteClubHistoryDocument>;
  let service: AthleteClubHistoryService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AthleteClubHistoryDocument>('AthleteClubHistory', AthleteClubHistorySchema);
    service = new AthleteClubHistoryService(new AthleteClubHistoryRepository(model));
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('leaves exactly one endDate:null row per athlete after a transfer', async () => {
    const athleteId = new Types.ObjectId().toString();

    const first = await service.create({
      athleteId,
      clubId: new Types.ObjectId().toString(),
      startDate: '2024-01-01',
    });

    const second = await service.create({
      athleteId,
      clubId: new Types.ObjectId().toString(),
      startDate: '2025-06-01',
    });

    const all = await model.find({ athleteId: new Types.ObjectId(athleteId) }).exec();
    expect(all).toHaveLength(2);

    const currentRows = all.filter((row) => row.endDate === null);
    expect(currentRows).toHaveLength(1);
    expect(currentRows[0]._id.toString()).toBe(second._id.toString());

    const closedFirst = all.find((row) => row._id.toString() === first._id.toString());
    expect(closedFirst?.endDate).toBeInstanceOf(Date);
  });
});
