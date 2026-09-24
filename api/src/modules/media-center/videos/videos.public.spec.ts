import { Types } from 'mongoose';
import { buildPublicVideoFilter } from './videos.public-filter.js';

/**
 * What the public library is allowed to show, and how a reader narrows it.
 *
 * The filter is built as a plain object and tested as one, without a database:
 * what matters is which keys end up in it. Two mistakes this pins, both of
 * which are silent in production:
 *
 * - A key set to `undefined` does not mean "any value" to Mongoose — it
 *   matches documents that LACK the field. `{ category: undefined }` is
 *   therefore the opposite of "every category", and the same trap
 *   `AuditLogsService.buildFilter` documents.
 * - An unescaped search term is a regular expression any visitor can type, so
 *   `.*` becomes a collection scan on demand.
 */
describe('buildPublicVideoFilter', () => {
  it('shows only published, unarchived videos when nothing narrows it', () => {
    expect(buildPublicVideoFilter({})).toEqual({ status: 'published', archivedAt: null });
  });

  it('adds no key for a filter the reader did not set', () => {
    const filter = buildPublicVideoFilter({});

    // Not `toBeUndefined()`: the key must be ABSENT, because a present
    // `undefined` matches documents missing the field.
    expect('category' in filter).toBe(false);
    expect('kind' in filter).toBe(false);
    expect('externalPlatform' in filter).toBe(false);
  });

  it.each([
    ['kind', 'reel'],
    ['category', 'championships'],
  ])('narrows by %s', (key, value) => {
    expect(buildPublicVideoFilter({ [key]: value })).toMatchObject({ [key]: value });
  });

  it('narrows by platform under the field the schema actually uses', () => {
    // The query parameter is `platform`; the stored field is `externalPlatform`.
    expect(buildPublicVideoFilter({ platform: 'youtube' })).toMatchObject({ externalPlatform: 'youtube' });
  });

  it('turns a season into a half-open range over publishedAt', () => {
    const filter = buildPublicVideoFilter({ season: '2025–2026' }) as {
      publishedAt: { $gte: Date; $lt: Date };
    };

    expect(filter.publishedAt.$gte.toISOString()).toBe('2025-09-01T00:00:00.000Z');
    expect(filter.publishedAt.$lt.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('ignores a season label it did not produce rather than matching nothing', () => {
    // A hand-edited query string should show the unfiltered library, not an
    // empty one that reads as "the federation has published nothing".
    expect('publishedAt' in buildPublicVideoFilter({ season: 'not-a-season' })).toBe(false);
  });

  it('escapes a search term before it becomes a regular expression', () => {
    const filter = buildPublicVideoFilter({ search: 'a.*b' }) as { $or: { [k: string]: RegExp }[] };

    const pattern = filter.$or[0]['title.ar'];
    expect(pattern.test('a.*b')).toBe(true);
    // Unescaped, `a.*b` would match this too — which is the collection scan.
    expect(pattern.test('axxxb')).toBe(false);
  });

  it('searches both language titles', () => {
    const filter = buildPublicVideoFilter({ search: 'relay' }) as { $or: Record<string, RegExp>[] };

    expect(filter.$or.map((clause) => Object.keys(clause)[0])).toEqual(['title.ar', 'title.en']);
  });

  it('combines a date window with the other filters rather than replacing them', () => {
    const filter = buildPublicVideoFilter({
      category: 'training',
      from: '2026-01-01',
      to: '2026-01-31',
    }) as Record<string, unknown> & { publishedAt: { $gte: Date; $lte: Date } };

    expect(filter.category).toBe('training');
    expect(filter.publishedAt.$gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // `to` runs to the end of its day, or a video published that afternoon
    // would fall outside a window the reader believes includes it.
    expect(filter.publishedAt.$lte.toISOString()).toBe('2026-01-31T23:59:59.999Z');
  });

  it('ignores a window that closes before it opens', () => {
    expect('publishedAt' in buildPublicVideoFilter({ from: '2026-05-01', to: '2026-01-01' })).toBe(false);
  });

  it('ignores a malformed date rather than comparing against Invalid Date', () => {
    expect('publishedAt' in buildPublicVideoFilter({ from: 'yesterday' })).toBe(false);
  });

  describe('association', () => {
    const id = new Types.ObjectId().toString();

    it('narrows to videos linked to one championship or event', () => {
      // Championships and events are not built yet, but a video can already
      // record that it belongs to one. Filtering by it now means the day the
      // entity ships, its page can list its videos without an API change.
      const filter = buildPublicVideoFilter({ association: `championships:${id}` });

      expect(filter.associations).toEqual({
        $elemMatch: { ownerType: 'championships', ownerId: expect.any(Types.ObjectId) },
      });
    });

    it.each(['championships', 'sportsEvents', 'publicEvents'])('accepts the owner type %s', (ownerType) => {
      expect('associations' in buildPublicVideoFilter({ association: `${ownerType}:${id}` })).toBe(true);
    });

    it.each([
      'athletes', // a real owner type, but not one this filter offers
      'clubs',
    ])('refuses the owner type %s, which this filter does not offer', (ownerType) => {
      expect('associations' in buildPublicVideoFilter({ association: `${ownerType}:${id}` })).toBe(false);
    });

    it.each([
      'championships',
      'championships:',
      ':' + new Types.ObjectId().toString(),
      'championships:not-an-id',
      'made-up:' + new Types.ObjectId().toString(),
      '',
    ])('ignores the malformed value %s rather than matching nothing', (value) => {
      expect('associations' in buildPublicVideoFilter({ association: value })).toBe(false);
    });
  });
});
