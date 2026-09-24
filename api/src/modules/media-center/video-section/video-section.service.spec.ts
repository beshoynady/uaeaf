import { VideoSectionService } from './video-section.service.js';

/**
 * What the homepage's video section receives, in one payload.
 *
 * The rule worth testing is the swap: while a broadcast is live it *replaces*
 * the featured video, and the featured video comes back by itself when the
 * broadcast ends. Nothing schedules that — the live lookup already hides an
 * expired stream, so "comes back" is simply what happens on the next read.
 */
const video = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: { ar: 'ع', en: 'e' },
  category: 'championships',
  kind: 'video',
  platform: 'youtube',
  url: `https://www.youtube.com/watch?v=${id}`,
  externalId: id,
  thumbnailId: null,
  publishedAt: new Date('2026-03-01T00:00:00.000Z'),
  season: '2025–2026',
  tags: [],
  ...extra,
});

const liveStream = { id: 'live1', title: { ar: 'ع', en: 'e' }, venue: null, videoId: 'LIVEID', url: 'u', startedAt: new Date(), expectedEndAt: new Date() };

const build = (options: {
  section?: Record<string, unknown> | null;
  live?: unknown;
  page?: { items: unknown[]; total: number };
  byIds?: unknown[];
}) => {
  const sections = { findOne: async () => options.section ?? null };
  const live = { findActive: async () => options.live ?? null };

  // Every query the service sends, so the tests that are about narrowing can
  // assert on the narrowing. The exclusion of reels happens in the database,
  // not in the service, so a fake that silently returned filtered rows would
  // certify a filter that was never sent.
  const queries: { page: number; limit: number; narrow: Record<string, unknown> }[] = [];
  const videos = {
    findPublicPage: async (page: number, limit: number, narrow: Record<string, unknown>) => {
      queries.push({ page, limit, narrow });
      // Page size 1 is the featured lookup; the carousel asks for more.
      if (limit === 1) return { items: (options.page?.items ?? []).slice(0, 1), total: 1, page: 1, limit: 1 };
      return options.page ?? { items: [], total: 0, page: 1, limit: 12 };
    },
    findPublicByIds: async () => options.byIds ?? [],
  };

  return { service: new VideoSectionService(sections as never, live as never, videos as never), queries };
};

const enabledSection = (configuration: Record<string, unknown> = {}) => ({
  enabled: true,
  sectionTitle: { ar: 'من قلب المضمار', en: 'From the track' },
  sectionSubtitle: { ar: 'وصف', en: 'description' },
  configuration,
});

describe('VideoSectionService', () => {
  it('reports the section off when no row configures it', async () => {
    // A homepage with no VIDEO_LIBRARY row should draw no section, not an
    // empty one with a heading over nothing.
    const payload = await build({ section: null }).service.findPublic();

    expect(payload.enabled).toBe(false);
    expect(payload.featured).toBeNull();
    expect(payload.carousel.items).toEqual([]);
  });

  it('reports the section off when an editor switched it off', async () => {
    const payload = await build({ section: { ...enabledSection(), enabled: false } }).service.findPublic();

    expect(payload.enabled).toBe(false);
  });

  it('features the newest published video by default', async () => {
    const payload = await build({
      section: enabledSection(),
      page: { items: [video('newest'), video('older')], total: 2 },
    }).service.findPublic();

    expect(payload.featured!.id).toBe('newest');
    expect(payload.live).toBeNull();
  });

  it('lets a live broadcast replace the featured video', async () => {
    const payload = await build({
      section: enabledSection(),
      live: liveStream,
      page: { items: [video('newest')], total: 1 },
    }).service.findPublic();

    expect(payload.live).not.toBeNull();
    // The featured video is still sent: the client shows the broadcast, and
    // has what it needs the moment the broadcast ends without a second fetch.
    expect(payload.featured!.id).toBe('newest');
  });

  it('gives the featured video back when the broadcast is over', async () => {
    // Nothing scheduled this. The live lookup hides an expired stream, so the
    // next read simply finds none.
    const payload = await build({
      section: enabledSection(),
      live: null,
      page: { items: [video('newest')], total: 1 },
    }).service.findPublic();

    expect(payload.live).toBeNull();
    expect(payload.featured!.id).toBe('newest');
  });

  it('asks the database to keep reels out of the carousel by default', async () => {
    // Asserted on the QUERY, because that is where the exclusion happens. A
    // fake that filtered its own rows would certify a filter never sent.
    const { service, queries } = build({ section: enabledSection(), page: { items: [], total: 0 } });

    await service.findPublic();

    const carouselQuery = queries.find((query) => query.limit > 1);
    expect(carouselQuery!.narrow.kind).toBe('video');
  });

  it('stops asking for that exclusion when an editor wants reels included', async () => {
    const { service, queries } = build({
      section: enabledSection({ carousel: { includeReels: true } }),
      page: { items: [], total: 0 },
    });

    await service.findPublic();

    const carouselQuery = queries.find((query) => query.limit > 1);
    expect('kind' in carouselQuery!.narrow).toBe(false);
  });

  it('asks for one more than the row needs, so dropping the featured still fills it', async () => {
    const { service, queries } = build({
      section: enabledSection({ carousel: { count: 4 } }),
      page: { items: [], total: 0 },
    });

    await service.findPublic();

    expect(queries.find((query) => query.limit > 1)!.limit).toBe(5);
  });

  it('keeps a manual selection in the order the editor arranged it', async () => {
    const payload = await build({
      section: enabledSection({
        carousel: { source: 'manual', manualIds: ['66f0a1b2c3d4e5f60718293b', '66f0a1b2c3d4e5f60718293a'] },
      }),
      byIds: [video('66f0a1b2c3d4e5f60718293b'), video('66f0a1b2c3d4e5f60718293a')],
    }).service.findPublic();

    expect(payload.carousel.items.map((item) => item.id)).toEqual([
      '66f0a1b2c3d4e5f60718293b',
      '66f0a1b2c3d4e5f60718293a',
    ]);
  });

  it('does not repeat the featured video inside its own carousel', async () => {
    const payload = await build({
      section: enabledSection(),
      page: { items: [video('featured'), video('second')], total: 2 },
    }).service.findPublic();

    expect(payload.featured!.id).toBe('featured');
    expect(payload.carousel.items.map((item) => item.id)).not.toContain('featured');
  });
});
