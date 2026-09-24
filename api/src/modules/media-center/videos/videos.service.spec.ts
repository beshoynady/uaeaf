import { VideosService } from './videos.service.js';
import type { VideosRepository } from './videos.repository.js';

/**
 * When a video becomes public, and what that stamps.
 *
 * `publishedAt` is the only date the public site orders by and the only thing
 * the season filter is derived from, so it has exactly one meaning: the moment
 * this video became visible. The editor never types it — a hand-typed date
 * would let the library claim an order the publication history disagrees with.
 *
 * A fake repository rather than a database: these are rules about *when* a
 * field is written, and a real Mongo round-trip would test Mongoose instead.
 */
const repositoryDouble = () => {
  const rows = new Map<string, Record<string, unknown>>();
  let next = 1;

  return {
    rows,
    create: async (data: Record<string, unknown>) => {
      const id = String(next++);
      const row = { ...data, _id: id };
      rows.set(id, row);
      return row;
    },
    findById: async (id: string) => rows.get(id) ?? null,
    updateById: async (id: string, patch: Record<string, unknown>) => {
      const row = rows.get(id);
      if (!row) return null;
      const updated = { ...row, ...patch };
      rows.set(id, updated);
      return updated;
    },
  };
};

const base = {
  title: { ar: 'سباق 100 متر', en: '100m final' },
  externalUrl: 'https://www.youtube.com/watch?v=abc',
  externalPlatform: 'youtube' as const,
  externalId: 'abc',
  category: 'championships' as const,
  kind: 'video' as const,
};

describe('VideosService — publication', () => {
  let repository: ReturnType<typeof repositoryDouble>;
  let service: VideosService;

  beforeEach(() => {
    repository = repositoryDouble();
    service = new VideosService(repository as unknown as VideosRepository);
  });

  it('creates a video as a draft with no publication date', async () => {
    const created = (await service.create({ ...base })) as unknown as Record<string, unknown>;

    expect(created.status).toBe('draft');
    expect(created.publishedAt).toBeNull();
  });

  it('stamps publishedAt at the moment a draft becomes published', async () => {
    const draft = (await service.create({ ...base })) as unknown as { _id: string };

    const published = (await service.update(draft._id, { status: 'published' })) as unknown as Record<
      string,
      unknown
    >;

    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeInstanceOf(Date);
  });

  it('keeps the original publishedAt when an already-published video is edited', async () => {
    const draft = (await service.create({ ...base })) as unknown as { _id: string };
    const first = (await service.update(draft._id, { status: 'published' })) as unknown as {
      publishedAt: Date;
    };

    const again = (await service.update(draft._id, {
      title: { ar: 'عنوان آخر', en: 'another title' },
    })) as unknown as { publishedAt: Date };

    expect(again.publishedAt).toEqual(first.publishedAt);
  });

  it('clears publishedAt when a published video is returned to draft', async () => {
    // Otherwise an unpublished video keeps a date the library would sort by
    // if it were ever published again by a different route.
    const draft = (await service.create({ ...base })) as unknown as { _id: string };
    await service.update(draft._id, { status: 'published' });

    const back = (await service.update(draft._id, { status: 'draft' })) as unknown as Record<string, unknown>;

    expect(back.publishedAt).toBeNull();
  });

  it('honours a publication date the caller supplies, for a back-dated import', async () => {
    const draft = (await service.create({ ...base })) as unknown as { _id: string };
    const backdated = new Date('2025-11-02T09:00:00.000Z');

    const published = (await service.update(draft._id, {
      status: 'published',
      publishedAt: backdated,
    })) as unknown as { publishedAt: Date };

    expect(published.publishedAt).toEqual(backdated);
  });
});
