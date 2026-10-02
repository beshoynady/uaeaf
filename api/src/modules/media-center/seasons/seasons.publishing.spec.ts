import { jest } from '@jest/globals';
import { Model, Types } from 'mongoose';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { SeasonsRepository } from './seasons.repository.js';
import { SeasonsService } from './seasons.service.js';
import { AlbumsRepository } from '../albums/albums.repository.js';
import { Album, AlbumSchema } from '../albums/schemas/album.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { VideosRepository } from '../videos/videos.repository.js';
import { Video, VideoSchema } from '../videos/schemas/video.schema.js';
import type { VideoDocument } from '../videos/schemas/video.schema.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * A season published through the shared publishing path is a season the
 * public reads find.
 *
 * The two halves are checked against each other here, on a real collection:
 * `PublishingService` writes the platform's state word and publish date, and
 * the public queries of `SeasonsService` read them back. Checked apart, each
 * half agrees with its own vocabulary and a published season can still vanish
 * from the site.
 *
 * Everything around the write — policy, review, revision, publication row,
 * audit — is stubbed: those are `PublishingService`'s own tests' business.
 */
describe('Publishing a season, then reading it publicly', () => {
  let server: MongoMemoryServer;
  let seasonModel: Model<SeasonDocument>;
  let seasons: SeasonsService;

  const publishedAt = new Date('2026-09-29T08:00:00.000Z');
  const actor = {
    userId: new Types.ObjectId().toString(),
    permissions: [
      { resourceType: 'seasons', action: 'Publish' },
      { resourceType: 'seasons', action: 'Read' },
    ],
  } as unknown as AuthenticatedUser;

  beforeAll(async () => {
    server = await connectTestDatabase();
    seasonModel = registerTestModel<SeasonDocument>(Season.name, SeasonSchema);
    const albumModel = registerTestModel<AlbumDocument>(Album.name, AlbumSchema);
    const videoModel = registerTestModel<VideoDocument>(Video.name, VideoSchema);
    await seasonModel.init();
    seasons = new SeasonsService(
      new SeasonsRepository(seasonModel),
      new AlbumsRepository(albumModel),
      new VideosRepository(videoModel),
    );
  });

  afterEach(async () => {
    await seasonModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const publishing = (mode: 'direct' | 'workflow') => {
    const revisionId = new Types.ObjectId();
    return new PublishingService(
      { resolve: jest.fn(async () => ({ mode, policy: {}, workflowDefinitionId: null, reason: null })) } as never,
      {
        findActive: jest.fn(async () => null),
        findLatestApproved: jest.fn(async () => ({ _id: new Types.ObjectId(), revisionId, status: 'Approved' })),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      { create: jest.fn(async () => ({ _id: revisionId })) } as never,
      { publish: jest.fn(async () => ({ _id: new Types.ObjectId(), publishedAt })) } as never,
      { write: jest.fn(async () => undefined) } as never,
      {} as never,
      {} as never,
      { models: { [Season.name]: seasonModel } } as never,
    );
  };

  /** A visible Draft, the only state a season can be created in and later published from. */
  const draft = async (slug: string) =>
    seasons.create({
      name: { en: 'Season', ar: 'موسم' },
      shortName: 'S',
      slug,
      // Required before publishing (PUBLISH_REQUIREMENTS); nothing here reads the file.
      bannerId: new Types.ObjectId().toString(),
      about: { en: 'About', ar: 'نبذة' },
      startDate: '2026-09-01T00:00:00+04:00',
      endDate: '2027-08-31T00:00:00+04:00',
      publicationState: 'Draft',
      isVisible: true,
    } as never);

  it('finds a season published directly on its public page and in the archive', async () => {
    const season = await draft('direct');
    expect(await seasons.getPublicBySlug('direct')).toBeNull();

    await publishing('direct').publishDirect({
      entityType: 'seasons',
      entityId: season._id,
      actor,
      expectedUpdatedAt: season.get('updatedAt') as Date,
    });

    expect((await seasons.getPublicBySlug('direct'))?.slug).toBe('direct');
    expect((await seasons.listPublic()).map((s) => s.slug)).toEqual(['direct']);
  });

  it('finds a season published after an approved review', async () => {
    const season = await draft('approved');

    await publishing('workflow').publishApproved({ entityType: 'seasons', entityId: season._id, actor });

    expect((await seasons.getPublicBySlug('approved'))?.slug).toBe('approved');
  });

  it('stores a state the schema allows and the date the publication records', async () => {
    const season = await draft('stored');

    await publishing('direct').publishDirect({
      entityType: 'seasons',
      entityId: season._id,
      actor,
      expectedUpdatedAt: season.get('updatedAt') as Date,
    });

    const stored = await seasonModel.findById(season._id).orFail().exec();
    await expect(stored.validate()).resolves.toBeUndefined();
    expect(stored.get('publishDate')).toEqual(publishedAt);
  });

  /**
   * `updatedBy` records the last hand on the record and moves with every
   * later edit; who put the season live has to survive those.
   */
  it('records who published it, not merely who touched it last', async () => {
    const season = await draft('by-whom');

    await publishing('direct').publishDirect({
      entityType: 'seasons',
      entityId: season._id,
      actor,
      expectedUpdatedAt: season.get('updatedAt') as Date,
    });

    const stored = await seasonModel.findById(season._id).orFail().exec();
    expect(stored.get('publishedBy')?.toString()).toBe(actor.userId);
  });
});
