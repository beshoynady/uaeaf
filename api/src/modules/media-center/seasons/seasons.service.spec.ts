import { Model, Types } from 'mongoose';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { SeasonsRepository } from './seasons.repository.js';
import { SeasonsService } from './seasons.service.js';
import { Album, AlbumSchema } from '../albums/schemas/album.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { AlbumsRepository } from '../albums/albums.repository.js';
import { Video, VideoSchema } from '../videos/schemas/video.schema.js';
import type { VideoDocument } from '../videos/schemas/video.schema.js';
import { VideosRepository } from '../videos/videos.repository.js';
import type { CreateSeasonDto } from './dto/create-season.dto.js';
import type { UpdateSeasonDto } from './dto/update-season.dto.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

describe('SeasonsService', () => {
  let server: MongoMemoryServer;
  let seasonModel: Model<SeasonDocument>;
  let albumModel: Model<AlbumDocument>;
  let videoModel: Model<VideoDocument>;
  let service: SeasonsService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    seasonModel = registerTestModel<SeasonDocument>(Season.name, SeasonSchema);
    albumModel = registerTestModel<AlbumDocument>(Album.name, AlbumSchema);
    videoModel = registerTestModel<VideoDocument>(Video.name, VideoSchema);
    await seasonModel.ensureIndexes();
    service = new SeasonsService(
      new SeasonsRepository(seasonModel),
      new AlbumsRepository(albumModel),
      new VideosRepository(videoModel),
    );
  });

  afterEach(async () => {
    await Promise.all([seasonModel.deleteMany({}), albumModel.deleteMany({}), videoModel.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  /** A Dubai calendar day as the dashboard sends it: that day's Dubai midnight. */
  const day = (date: string): string => `${date}T00:00:00+04:00`;
  /** A Dubai wall-clock instant. */
  const dubai = (local: string): Date => new Date(`${local}+04:00`);

  const dto = (overrides: Partial<CreateSeasonDto> = {}): CreateSeasonDto =>
    ({
      name: { en: 'Season', ar: 'موسم' },
      shortName: 'S',
      slug: '2026-2027',
      about: { en: 'About', ar: 'نبذة' },
      startDate: day('2026-09-01'),
      endDate: day('2027-08-31'),
      publicationState: 'Draft',
      ...overrides,
    }) as CreateSeasonDto;

  describe('create — no two seasons may overlap', () => {
    it('creates a season with no conflict', async () => {
      const season = await service.create(dto());
      expect(season.slug).toBe('2026-2027');
    });

    it('rejects a season whose range intersects an existing one', async () => {
      await service.create(dto());

      await expect(
        service.create(dto({ slug: 'overlap', startDate: day('2027-06-01'), endDate: day('2028-05-31') })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows a season starting the day after another ends', async () => {
      await service.create(dto());

      const next = await service.create(dto({ slug: 'next', startDate: day('2027-09-01'), endDate: day('2028-08-31') }));

      expect(next.slug).toBe('next');
    });

    // The dates are inclusive Dubai days, so first day == last day is a
    // season lasting one day, exactly as a one-day phase is.
    it('accepts a season whose first and last day are the same', async () => {
      const oneDay = await service.create(
        dto({ slug: 'one-day', startDate: day('2026-09-01'), endDate: day('2026-09-01') }),
      );

      expect(oneDay.slug).toBe('one-day');
    });

    it('accepts one day however far apart the two instants sit inside it', async () => {
      const oneDay = await service.create(
        dto({
          slug: 'one-long-day',
          startDate: '2026-09-01T20:00:00.000Z',
          endDate: '2026-09-02T19:59:00.000Z',
        }),
      );

      expect(oneDay.slug).toBe('one-long-day');
    });

    it('rejects a last day falling before the first', async () => {
      await expect(
        service.create(dto({ startDate: day('2026-09-02'), endDate: day('2026-09-01') })),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('update — no two seasons may overlap', () => {
    it('rejects an update that would overlap a third season', async () => {
      await service.create(dto({ slug: 'a' }));
      const b = await service.create(
        dto({ slug: 'b', startDate: day('2027-09-01'), endDate: day('2028-08-31') }),
      );
      await service.create(dto({ slug: 'c', startDate: day('2028-09-01'), endDate: day('2029-08-31') }));

      await expect(
        service.update(b._id.toString(), { startDate: day('2026-10-01') } as UpdateSeasonDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows an update that merely overlaps itself', async () => {
      const a = await service.create(dto({ slug: 'a' }));

      const updated = await service.update(a._id.toString(), { shortName: 'Updated' } as UpdateSeasonDto);

      expect(updated?.shortName).toBe('Updated');
    });

    it('allows shrinking a season inside its own original range without colliding with itself', async () => {
      const a = await service.create(dto({ slug: 'a' }));

      const updated = await service.update(a._id.toString(), {
        startDate: day('2026-10-01'),
        endDate: day('2027-07-31'),
      } as UpdateSeasonDto);

      expect(updated?.startDate.toISOString()).toBe('2026-09-30T20:00:00.000Z');
    });
  });

  describe('remove — a referenced season cannot be deleted', () => {
    it('archives a season nothing references', async () => {
      const season = await service.create(dto());

      const archived = await service.remove(season._id.toString(), new Types.ObjectId());

      expect(archived?.archivedAt).not.toBeNull();
    });

    it('refuses with 409 when a live album falls inside its range', async () => {
      const season = await service.create(dto());
      await albumModel.create({
        title: { en: 'A', ar: 'أ' },
        slug: 'inside-album',
        displayOrder: 1,
        publicationState: 'Published',
        eventDate: new Date('2026-10-01T00:00:00.000Z'),
      });

      let thrown: unknown;
      try {
        await service.remove(season._id.toString(), new Types.ObjectId());
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getStatus()).toBe(409);
      expect((thrown as ConflictException).getResponse()).toMatchObject({
        code: 'stillReferenced',
        referrers: ['1 album(s)'],
      });
    });

    it('refuses with 409 when a live video falls inside its range', async () => {
      const season = await service.create(dto());
      await videoModel.create({
        title: { en: 'V', ar: 'ف' },
        category: 'events',
        externalId: 'abc123',
        externalPlatform: 'youtube',
        externalUrl: 'https://youtube.com/watch?v=abc123',
        status: 'published',
        publishedAt: new Date('2026-11-15T00:00:00.000Z'),
      });

      await expect(service.remove(season._id.toString(), new Types.ObjectId())).rejects.toBeInstanceOf(ConflictException);
    });

    it('archives a season once the referencing album falls outside its range', async () => {
      const season = await service.create(dto());
      await albumModel.create({
        title: { en: 'A', ar: 'أ' },
        slug: 'outside-album',
        displayOrder: 1,
        publicationState: 'Published',
        eventDate: new Date('2020-01-01T00:00:00.000Z'),
      });

      const archived = await service.remove(season._id.toString(), new Types.ObjectId());

      expect(archived?.archivedAt).not.toBeNull();
    });
  });
  /** What a rejected promise threw, for asserting on the response body. */
  const refusal = async (attempt: Promise<unknown>): Promise<{ status: number; body: Record<string, unknown> }> => {
    try {
      await attempt;
    } catch (error) {
      const http = error as ConflictException;
      return { status: http.getStatus(), body: http.getResponse() as Record<string, unknown> };
    }
    throw new Error('expected a refusal, got success');
  };

  describe('season days are inclusive Dubai calendar days', () => {
    it('refuses with seasonOverlap a season starting on the last day of another', async () => {
      const first = await service.create(dto());

      const { status, body } = await refusal(
        service.create(dto({ slug: 'shares-a-day', startDate: day('2027-08-31'), endDate: day('2028-08-30') })),
      );

      expect(status).toBe(409);
      expect(body).toMatchObject({ code: 'seasonOverlap', conflictingSeasonId: first._id.toString() });
    });

    it('refuses with seasonOverlap an update moving the end onto the next season first day', async () => {
      const a = await service.create(dto({ slug: 'a' }));
      await service.create(dto({ slug: 'b', startDate: day('2027-09-01'), endDate: day('2028-08-31') }));

      const { status, body } = await refusal(
        service.update(a._id.toString(), { endDate: day('2027-09-01') } as UpdateSeasonDto),
      );

      expect(status).toBe(409);
      expect(body).toMatchObject({ code: 'seasonOverlap' });
    });

    const albumAt = (eventDate: Date, slug: string) =>
      albumModel.create({
        title: { en: 'A', ar: 'أ' },
        slug,
        displayOrder: 1,
        publicationState: 'Published',
        eventDate,
      });

    it('counts an event at 23:30 Dubai on the last day as inside the season', async () => {
      const season = await service.create(dto());
      await albumAt(dubai('2027-08-31T23:30:00'), 'last-evening');

      const { status, body } = await refusal(service.remove(season._id.toString(), new Types.ObjectId()));

      expect(status).toBe(409);
      expect(body).toMatchObject({ code: 'stillReferenced', referrers: ['1 album(s)'] });
    });

    it('counts an event at 00:00 Dubai on the following day as outside the season', async () => {
      const season = await service.create(dto());
      await albumAt(dubai('2027-09-01T00:00:00'), 'next-midnight');

      const archived = await service.remove(season._id.toString(), new Types.ObjectId());

      expect(archived?.archivedAt).not.toBeNull();
    });

    it('counts an event at 02:00 Dubai on the first day (22:00 UTC the day before) as inside the season', async () => {
      // Sent as a bare date: stored as 04:00 Dubai on the 1st, still that day.
      const season = await service.create(dto({ startDate: '2026-09-01' }));
      const early = dubai('2026-09-01T02:00:00');
      expect(early.toISOString()).toBe('2026-08-31T22:00:00.000Z');
      await albumAt(early, 'first-night');

      const { status } = await refusal(service.remove(season._id.toString(), new Types.ObjectId()));

      expect(status).toBe(409);
    });

    it('withholds the closing summary through the whole of the last Dubai day', async () => {
      const closed = { en: 'Closed', ar: 'اختُتم' };
      const todayInDubai = new Date(
        `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date())}T00:00:00+04:00`,
      );
      const yesterdayInDubai = new Date(todayInDubai.getTime() - 24 * 60 * 60 * 1000);
      const visible = { publicationState: 'Live', isVisible: true } as const;
      await seasonModel.create([
        {
          ...dto({ slug: 'ends-today', startDate: day('2025-09-01') }),
          ...visible,
          endDate: todayInDubai,
          closingSummary: closed,
        },
        {
          ...dto({ slug: 'ended-yesterday', startDate: day('2024-09-01') }),
          ...visible,
          endDate: yesterdayInDubai,
          closingSummary: closed,
        },
      ]);

      expect((await service.getPublicBySlug('ends-today'))?.closingSummary).toBeNull();
      expect((await service.getPublicBySlug('ended-yesterday'))?.closingSummary).toMatchObject(closed);
    });
  });

  describe('phases — same type never shares a day, every phase inside the season', () => {
    const phase = (type: string, from: string, to: string, name = `${type} ${from}`) => ({
      name: { en: name, ar: name },
      type,
      from: day(from),
      to: day(to),
    });
    const withPhases = (...phases: ReturnType<typeof phase>[]) =>
      dto({ phases } as unknown as Partial<CreateSeasonDto>);

    it('refuses two phases of one type sharing a day, naming both and the type', async () => {
      const { status, body } = await refusal(
        service.create(
          withPhases(
            phase('domestic', '2026-10-01', '2027-03-31', 'Winter'),
            phase('rest', '2027-04-01', '2027-04-30', 'Break'),
            phase('domestic', '2027-03-31', '2027-06-30', 'Spring'),
          ),
        ),
      );

      expect(status).toBe(422);
      expect(body).toMatchObject({
        code: 'seasonPhaseOverlap',
        phaseType: 'domestic',
        phases: [
          { index: 0, name: { en: 'Winter' } },
          { index: 2, name: { en: 'Spring' } },
        ],
      });
      expect(body.message).toContain('"Winter"');
      expect(body.message).toContain('"Spring"');
      expect(body.message).toContain('"domestic"');
    });

    it('accepts two phases of one type on consecutive days', async () => {
      const season = await service.create(
        withPhases(phase('domestic', '2026-10-01', '2027-03-31'), phase('domestic', '2027-04-01', '2027-06-30')),
      );

      expect(season.phases).toHaveLength(2);
    });

    it('accepts phases of different types that overlap', async () => {
      const season = await service.create(
        withPhases(phase('preparation', '2026-09-01', '2027-01-31'), phase('domestic', '2026-12-01', '2027-06-30')),
      );

      expect(season.phases).toHaveLength(2);
    });

    it('accepts a phase ending on the season last day', async () => {
      const season = await service.create(withPhases(phase('rest', '2027-08-01', '2027-08-31')));

      expect(season.phases).toHaveLength(1);
    });

    it('refuses a phase running one day past the season last day', async () => {
      const { status, body } = await refusal(service.create(withPhases(phase('rest', '2027-08-01', '2027-09-01'))));

      expect(status).toBe(422);
      // Named, so the form can point at the row instead of showing the
      // editor an unattributed `badRequest`.
      expect(body).toMatchObject({ code: 'seasonPhaseOutOfRange', phase: { index: 0 } });
    });

    it('refuses a phase starting the day before the season first day', async () => {
      const { status } = await refusal(service.create(withPhases(phase('preparation', '2026-08-31', '2026-10-31'))));

      expect(status).toBe(422);
    });

    it('refuses a phase ending on a day before it starts', async () => {
      const { status } = await refusal(service.create(withPhases(phase('rest', '2027-05-10', '2027-05-01'))));

      expect(status).toBe(422);
    });

    it('refuses shrinking a season past a phase it already has', async () => {
      const season = await service.create(withPhases(phase('rest', '2027-08-01', '2027-08-31')));

      const { status } = await refusal(
        service.update(season._id.toString(), { endDate: day('2027-08-30') } as UpdateSeasonDto),
      );

      expect(status).toBe(422);
    });

    it('refuses an update sending two same-type phases that share a day', async () => {
      const season = await service.create(dto());

      const { body } = await refusal(
        service.update(season._id.toString(), {
          phases: [phase('international', '2027-01-01', '2027-02-15'), phase('international', '2027-02-15', '2027-03-31')],
        } as unknown as UpdateSeasonDto),
      );

      expect(body).toMatchObject({ code: 'seasonPhaseOverlap', phaseType: 'international' });
    });
  });

  // The overlap check reads live seasons only, so an archived season's days
  // may be taken by a new one. Bringing the archived one back is then a second
  // season on the same days, refused exactly as a create would be.
  describe('unarchive — no two seasons may overlap', () => {
    it('refuses to bring back a season whose days another season now holds', async () => {
      const archived = await service.create(dto({ slug: 'archived' }));
      await service.remove(archived._id.toString(), new Types.ObjectId());
      const successor = await service.create(dto({ slug: 'successor' }));

      const { status, body } = await refusal(service.unarchive(archived._id.toString()));

      expect(status).toBe(409);
      expect(body).toMatchObject({ code: 'seasonOverlap', conflictingSeasonId: successor._id.toString() });
      expect((await seasonModel.findById(archived._id).lean())?.archivedAt).not.toBeNull();
    });

    it('brings back a season whose days are still free', async () => {
      const archived = await service.create(dto({ slug: 'archived' }));
      await service.remove(archived._id.toString(), new Types.ObjectId());
      await service.create(dto({ slug: 'next', startDate: day('2027-09-01'), endDate: day('2028-08-31') }));

      const restored = await service.unarchive(archived._id.toString());

      expect(restored?.archivedAt).toBeNull();
    });

    it('refuses with 409, not a server error, when another season now holds its address', async () => {
      const archived = await service.create(dto({ slug: 'shared' }));
      await service.remove(archived._id.toString(), new Types.ObjectId());
      await service.create(dto({ slug: 'shared', startDate: day('2027-09-01'), endDate: day('2028-08-31') }));

      const { status } = await refusal(service.unarchive(archived._id.toString()));

      expect(status).toBe(409);
    });

    it('answers a season that is not archived with itself, checking nothing', async () => {
      const live = await service.create(dto({ slug: 'live' }));

      const restored = await service.unarchive(live._id.toString());

      expect(restored?._id.toString()).toBe(live._id.toString());
    });
  });
});
