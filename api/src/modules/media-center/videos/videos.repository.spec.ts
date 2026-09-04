import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { VideoSchema } from './schemas/video.schema.js';
import type { VideoDocument } from './schemas/video.schema.js';
import { VideosRepository } from './videos.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

describe('VideosRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<VideoDocument>;
  let repository: VideosRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<VideoDocument>('Video', VideoSchema);
    repository = new VideosRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const baseVideo = {
    title: { en: 'Live Now', ar: 'مباشر الآن' },
    contentCategoryId: new Types.ObjectId(),
    externalPlatform: 'YouTube' as const,
    externalUrl: 'https://youtube.com/watch?v=1',
  };

  it('going live gracefully unsets the previously-live video, leaving exactly one isLive:true', async () => {
    const first = await repository.create({ ...baseVideo, isLive: true });
    const second = await repository.create({ ...baseVideo, externalUrl: 'https://youtube.com/watch?v=2', isLive: true });

    const all = await model.find({}).exec();
    const liveVideos = all.filter((video) => video.isLive);
    expect(liveVideos).toHaveLength(1);
    expect(liveVideos[0]._id.toString()).toBe(second._id.toString());

    const refreshedFirst = await model.findById(first._id).exec();
    expect(refreshedFirst?.isLive).toBe(false);
  });

  it('allows any number of non-live videos to coexist', async () => {
    await repository.create({ ...baseVideo, isLive: false });
    await repository.create({ ...baseVideo, externalUrl: 'https://youtube.com/watch?v=2', isLive: false });

    const all = await model.find({}).exec();
    expect(all).toHaveLength(2);
  });
});
