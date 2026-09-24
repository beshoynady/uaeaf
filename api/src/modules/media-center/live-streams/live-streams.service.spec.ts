import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { LiveStreamSchema } from './schemas/live-stream.schema.js';
import type { LiveStreamDocument } from './schemas/live-stream.schema.js';
import { LiveStreamsRepository } from './live-streams.repository.js';
import { LiveStreamsService } from './live-streams.service.js';
import { liveStreamState, toAdminLiveStream } from './dto/live-stream-admin-response.dto.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * One broadcast at a time, and it ends by itself.
 *
 * Against a real database, because both guarantees this file exists for are
 * database guarantees: the partial unique index is what makes "only one
 * active" true under a race, and a fake repository would only prove that the
 * service calls itself in the order it was written.
 *
 * Review Focus 2 (two editors starting at once) and 3 (an end time that
 * passes with nobody pressing anything) both live here.
 */
describe('LiveStreamsService', () => {
  let server: MongoMemoryServer;
  let service: LiveStreamsService;
  let repository: LiveStreamsRepository;
  let uploads: string[];

  /**
   * The platform, stubbed at the network edge.
   *
   * `storeResolvedThumbnail` calls the real resolver, so without this every
   * `start()` in this file would reach out to YouTube for an id that does not
   * exist — slow, flaky, and it would silently store no picture, which is
   * exactly the state these tests are trying to tell apart from a real one.
   *
   * A 1×1 JPEG, so the upload guard sees genuine image bytes.
   */
  const JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
    'base64',
  );

  const stubPlatform = () => {
    global.fetch = (async (input: unknown) => {
      const href = String(input);
      if (href.includes('/oembed')) {
        return new Response(
          JSON.stringify({ title: 'Final day', thumbnail_url: 'https://i.ytimg.com/vi/LIVEID/hq.jpg', width: 480, height: 270 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }) as unknown as typeof fetch;
  };

  const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

  const start = {
    url: 'https://www.youtube.com/live/LIVEID',
    title: { ar: 'اليوم الختامي', en: 'Final day' },
    venue: null,
    expectedEndAt: hoursFromNow(3),
  };

  beforeAll(async () => {
    server = await connectTestDatabase();
    const model = registerTestModel<LiveStreamDocument>('LiveStream', LiveStreamSchema);
    repository = new LiveStreamsRepository(model);
    // A stub: this file is about the broadcast rules, and the still is a
    // best-effort side errand with its own tests. `resolveVideo` would make
    // an outbound request per start, which no unit test should.
    const mediaAssets = {
      uploadAndCreate: async (file: { originalname: string }) => {
        uploads.push(file.originalname);
        return { _id: new Types.ObjectId() } as never;
      },
    };
    service = new LiveStreamsService(repository, mediaAssets as never);
  });

  beforeEach(() => {
    uploads = [];
    stubPlatform();
  });

  afterEach(async () => {
    await clearTestDatabase();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  describe('starting', () => {
    it('reads the YouTube id out of the pasted link', async () => {
      const started = await service.start(start);

      expect(started.videoId).toBe('LIVEID');
      expect(started.isActive).toBe(true);
      expect(started.endedAt).toBeNull();
    });

    it('refuses a link that is not YouTube', async () => {
      // Format only. Nothing here claims the stream is genuinely live —
      // only YouTube could answer that, and asking it is out of scope.
      await expect(service.start({ ...start, url: 'https://www.tiktok.com/@a/video/7' })).rejects.toThrow();
      await expect(service.start({ ...start, url: 'https://evil.test/live/x' })).rejects.toThrow();
    });

    it('ends the running broadcast when a new one starts, leaving exactly one', async () => {
      const first = await service.start(start);

      const second = await service.start({ ...start, url: 'https://www.youtube.com/live/SECOND' });

      const previous = await repository.findById(String(first._id));
      expect(previous!.isActive).toBe(false);
      expect(previous!.endedAt).not.toBeNull();
      expect(await service.countActive()).toBe(1);
      expect(String((await service.findActive())!._id)).toBe(String(second._id));
    });

    it('keeps exactly one active when two editors start at the same moment', async () => {
      const results = await Promise.allSettled([
        service.start(start),
        service.start({ ...start, url: 'https://www.youtube.com/live/SECOND' }),
      ]);

      // Every outcome is a successful start or a clean 409 — never a second
      // active row, and never a raw duplicate-key error reaching the editor.
      for (const result of results) {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(ConflictException);
        }
      }
      expect(await service.countActive()).toBe(1);
    });
  });

  describe('finding the active one', () => {
    it('reports nothing once the end time has passed, with nobody having ended it', async () => {
      // The reason there is no cron: expiry is evaluated when somebody reads.
      await repository.create({
        ...start,
        videoId: 'LIVEID',
        startedAt: hoursFromNow(-4),
        expectedEndAt: hoursFromNow(-1),
        endedAt: null,
        isActive: true,
      });

      expect(await service.findActive()).toBeNull();
    });

    it('reports the stream while it is still within its window', async () => {
      await service.start(start);

      expect(await service.findActive()).not.toBeNull();
    });

    it('reports nothing after an editor ends it early', async () => {
      const started = await service.start(start);

      await service.end(String(started._id));

      expect(await service.findActive()).toBeNull();
      expect(await service.countActive()).toBe(0);
    });

    it('reports nothing at all when none has ever run', async () => {
      expect(await service.findActive()).toBeNull();
    });
  });

  describe('reading one for the editor screen', () => {
    it('still answers a broadcast whose time has passed', async () => {
      // The whole reason this read exists. `findActive` hides an expired
      // broadcast from the site, and an editor standing in front of a
      // championship that ran long must be told it ran long, not that the
      // record is gone.
      const expired = await repository.create({
        ...start,
        videoId: 'LIVEID',
        startedAt: hoursFromNow(-4),
        expectedEndAt: hoursFromNow(-1),
        endedAt: null,
        isActive: true,
      });

      const found = await service.findForEditor(String(expired._id));

      expect(found).not.toBeNull();
      expect(await service.findActive()).toBeNull();
    });

    it('returns both languages of the title and the venue', async () => {
      // A save writes back what the screen was given, so a shape reduced to
      // one language would make every edit an erasure of the other.
      const started = await service.start({
        ...start,
        title: { ar: 'اليوم الختامي', en: 'Final day' },
        venue: { ar: 'استاد زايد', en: 'Zayed Stadium' },
      });

      const found = await service.findForEditor(String(started._id));

      expect(found!.title).toMatchObject({ ar: 'اليوم الختامي', en: 'Final day' });
      expect(found!.venue).toMatchObject({ ar: 'استاد زايد', en: 'Zayed Stadium' });
      expect(found!.expectedEndAt).toBeInstanceOf(Date);
      expect(found!.url).toBe(start.url);
    });

    it('answers nothing for an id that names no broadcast', async () => {
      expect(await service.findForEditor('6ab4c51a319a66003190e53f')).toBeNull();
    });

    it('answers nothing — rather than throwing — for an id that is not an id', async () => {
      // Mongoose raises a CastError on `_id: 'nonsense'`, which would surface
      // as a 500. A hand-edited address is a wrong address: that is a 404.
      await expect(service.findForEditor('not-an-object-id')).resolves.toBeNull();
    });
  });

  describe('the still', () => {
    it('is stored on the broadcast once it is already on air', async () => {
      const started = await service.start(start);

      expect(started.thumbnailId).not.toBeNull();
      expect(uploads).toEqual(['youtube-LIVEID.jpg']);
    });

    it('uploads nothing when the request never becomes a broadcast', async () => {
      // Captured before the insert, a lost race left an uploaded picture
      // behind for a broadcast that was never written. The order is the fix.
      await expect(service.start({ ...start, expectedEndAt: hoursFromNow(-1) })).rejects.toThrow();

      expect(uploads).toEqual([]);
    });

    it('clears the still when the link is corrected, rather than keeping the old one', async () => {
      const started = await service.start(start);
      expect(started.thumbnailId).not.toBeNull();

      const patched = await service.update(String(started._id), {
        url: 'https://www.youtube.com/live/OTHERID',
      });

      expect(patched!.videoId).toBe('OTHERID');
      expect(patched!.thumbnailId).toBeNull();
    });
  });

  describe('refusing an end time that has already passed', () => {
    it('refuses it, and does NOT take the running broadcast off air', async () => {
      // The order is the whole point. `start()` deactivates whatever is live
      // before it inserts, so validating afterwards would leave the site with
      // no broadcast at all — the running one ended, and the replacement
      // hidden by `findActive` the moment it was written.
      const running = await service.start(start);

      await expect(service.start({ ...start, expectedEndAt: hoursFromNow(-1) })).rejects.toThrow(
        BadRequestException,
      );

      const still = await service.findActive();
      expect(still).not.toBeNull();
      expect(String(still!._id)).toBe(String(running._id));
      expect(await service.countActive()).toBe(1);
    });

    it('refuses the same time on a patch', async () => {
      const running = await service.start(start);

      await expect(
        service.update(String(running._id), { expectedEndAt: hoursFromNow(-1) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('still accepts a time in the future', async () => {
      const running = await service.start(start);

      const patched = await service.update(String(running._id), { expectedEndAt: hoursFromNow(5) });

      expect(patched!.expectedEndAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('refusing a write to a broadcast that is over', () => {
    it('refuses a patch to one whose time has passed', async () => {
      // The screen sends this one to "it ran past its time" instead of the
      // form, so the rule existed only in the layer that cannot enforce it.
      const expired = await repository.create({
        ...start,
        videoId: 'LIVEID',
        startedAt: hoursFromNow(-4),
        expectedEndAt: hoursFromNow(-1),
        endedAt: null,
        isActive: true,
      });

      await expect(
        service.update(String(expired._id), { title: { ar: 'جديد', en: 'New' } }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses a patch to one somebody ended', async () => {
      const started = await service.start(start);
      await service.end(String(started._id));

      await expect(
        service.update(String(started._id), { title: { ar: 'جديد', en: 'New' } }),
      ).rejects.toThrow(ConflictException);
    });

    it('answers nothing for an id that names no broadcast', async () => {
      expect(await service.update('6ab4c51a319a66003190e53f', { title: { ar: 'x', en: 'x' } })).toBeNull();
    });

    it('still patches the one that is running', async () => {
      const running = await service.start(start);

      const patched = await service.update(String(running._id), { title: { ar: 'مُصحّح', en: 'Fixed' } });

      expect(patched!.title.ar).toBe('مُصحّح');
    });
  });

  describe('the state it publishes', () => {
    it('calls a running broadcast live', async () => {
      const started = await service.start(start);

      expect(liveStreamState(started)).toBe('live');
    });

    it('calls a broadcast past its stated end expired, not ended', async () => {
      // Nobody pressed anything, so `isActive` is still true. The clock is the
      // whole mechanism, and this is the verdict the editor screen turns into
      // "this broadcast ran past its time".
      const expired = await repository.create({
        ...start,
        videoId: 'LIVEID',
        startedAt: hoursFromNow(-4),
        expectedEndAt: hoursFromNow(-1),
        endedAt: null,
        isActive: true,
      });

      expect(expired.isActive).toBe(true);
      expect(liveStreamState(expired)).toBe('expired');
    });

    it('calls a broadcast somebody ended "ended", and does not say who', async () => {
      // `end()` and the sweep `start()` runs write the same two fields, so the
      // record cannot tell them apart — and neither may anything reading it.
      const started = await service.start(start);
      const ended = await service.end(String(started._id));

      expect(liveStreamState(ended!)).toBe('ended');
    });

    it('reports a replaced broadcast the same way, because the record cannot tell', async () => {
      const first = await service.start(start);
      await service.start({ ...start, url: 'https://www.youtube.com/live/SECOND' });

      const replaced = await service.findForEditor(String(first._id));

      expect(replaced!.endedAt).toBeInstanceOf(Date);
      expect(liveStreamState(replaced!)).toBe('ended');
    });

    it('rides along on the admin shape, so no client recomputes it', async () => {
      const started = await service.start(start);

      expect(toAdminLiveStream(started).state).toBe('live');
    });
  });

  describe('ending', () => {
    it('stamps the end time and clears the flag', async () => {
      const started = await service.start(start);

      const ended = await service.end(String(started._id));

      expect(ended!.isActive).toBe(false);
      expect(ended!.endedAt).toBeInstanceOf(Date);
    });

    it('is harmless when called twice', async () => {
      // Two editors can both press "end now" on the same banner.
      const started = await service.start(start);

      await service.end(String(started._id));
      const again = await service.end(String(started._id));

      expect(again!.isActive).toBe(false);
      expect(await service.countActive()).toBe(0);
    });
  });
});
