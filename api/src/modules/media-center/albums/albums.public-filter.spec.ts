import { Types } from 'mongoose';
import { buildAlbumFilter } from './albums.public-filter.js';

/**
 * The filter is a plain object built outside the service so it can be tested
 * as one: every rule here is about which keys exist, and a database round trip
 * would be testing Mongoose instead.
 *
 * Two rules carry the weight, the same two the video library's filter
 * documents:
 *
 * - **Only supplied fields become keys.** `{ seasonId: undefined }` does not
 *   mean "any season" to Mongo — it matches documents that LACK the field,
 *   which is the opposite.
 * - **A bad narrowing is ignored, not answered with nothing.** A stale or
 *   hand-edited query string shows the unfiltered gallery rather than an empty
 *   one, because an empty list reads to a visitor as "the federation has
 *   published nothing", which is a lie about the organisation.
 */
describe('buildAlbumFilter', () => {
  const id = () => new Types.ObjectId().toString();

  it('always restricts to published, non-archived albums', () => {
    expect(buildAlbumFilter({})).toEqual({ publicationState: 'Published', archivedAt: null });
  });

  it('adds no key for a parameter that was not supplied', () => {
    expect(Object.keys(buildAlbumFilter({}))).toEqual(['publicationState', 'archivedAt']);
  });

  it('turns a season label into a half-open range, the same as the video library', () => {
    const filter = buildAlbumFilter({ season: '2025–2026' });

    expect(filter.eventDate).toEqual({
      $gte: new Date('2025-09-01T00:00:00.000Z'),
      $lt: new Date('2026-09-01T00:00:00.000Z'),
    });
  });

  it('ignores a label that names no real season', () => {
    expect(buildAlbumFilter({ season: '2025–2027' }).eventDate).toBeUndefined();
    expect(buildAlbumFilter({ season: 'last year' }).eventDate).toBeUndefined();
  });

  it('lets an explicit range win over a season, because it is more specific', () => {
    const filter = buildAlbumFilter({ season: '2025–2026', from: '2026-01-01', to: '2026-01-31' });

    expect(filter.eventDate).toEqual({
      $gte: new Date('2026-01-01'),
      $lte: new Date('2026-01-31T23:59:59.999Z'),
    });
  });

  it('filters by championship, which also returns its competitions albums', () => {
    // An album of a competition carries its championship too — the editor
    // filled both — so no $or is needed to reach down the tree.
    const championshipId = id();
    expect(buildAlbumFilter({ championship: championshipId }).championshipId).toEqual(
      new Types.ObjectId(championshipId),
    );
  });

  it('filters by competition, athlete, club and public event', () => {
    const competition = id();
    const athlete = id();
    const club = id();
    const publicEvent = id();

    const filter = buildAlbumFilter({ competition, athlete, club, publicEvent });

    expect(filter.competitionId).toEqual(new Types.ObjectId(competition));
    expect(filter.athleteIds).toEqual(new Types.ObjectId(athlete));
    expect(filter.clubIds).toEqual(new Types.ObjectId(club));
    expect(filter.publicEventId).toEqual(new Types.ObjectId(publicEvent));
  });

  it('ignores a malformed id rather than returning an empty gallery', () => {
    expect(buildAlbumFilter({ championship: 'not-an-id' }).championshipId).toBeUndefined();
  });

  it('ranges over eventDate for a period', () => {
    const filter = buildAlbumFilter({ from: '2026-01-01', to: '2026-06-30' });

    expect(filter.eventDate).toEqual({
      $gte: new Date('2026-01-01'),
      $lte: new Date('2026-06-30T23:59:59.999Z'),
    });
  });

  it('includes the whole of the last day, because `to` is documented as inclusive', () => {
    // A bare date parses to midnight. Compared with `$lte` that would exclude
    // everything that happened on the day the visitor asked for.
    const filter = buildAlbumFilter({ to: '2026-06-30' });

    expect((filter.eventDate as { $lte: Date }).$lte.toISOString()).toBe('2026-06-30T23:59:59.999Z');
  });

  it('accepts an open-ended period', () => {
    expect(buildAlbumFilter({ from: '2026-01-01' }).eventDate).toEqual({ $gte: new Date('2026-01-01') });
    expect((buildAlbumFilter({ to: '2026-06-30' }).eventDate as { $lte: Date }).$lte.getUTCHours()).toBe(23);
  });

  it('ignores an unparseable date rather than matching nothing', () => {
    expect(buildAlbumFilter({ from: 'yesterday' }).eventDate).toBeUndefined();
  });

  it('builds a range that matches nothing when from is after to', () => {
    // Truthful: a range with no days in it contains no albums. Not ignored,
    // because the visitor did ask for an impossible window.
    const filter = buildAlbumFilter({ from: '2026-06-01', to: '2026-01-01' });

    expect(filter.eventDate).toEqual({
      $gte: new Date('2026-06-01'),
      $lte: new Date('2026-01-01T23:59:59.999Z'),
    });
  });

  it('searches title and location in both languages', () => {
    const filter = buildAlbumFilter({ q: 'dubai' });

    expect(filter.$or).toHaveLength(4);
    expect(filter.$or?.map((clause: Record<string, unknown>) => Object.keys(clause)[0])).toEqual([
      'title.ar',
      'title.en',
      'location.ar',
      'location.en',
    ]);
  });

  it('escapes regex specials, so a search box cannot trigger a collection scan', () => {
    const filter = buildAlbumFilter({ q: 'a.*b' });

    expect(String((filter.$or?.[0] as Record<string, RegExp>)['title.ar'])).toContain('a\\.\\*b');
  });

  it('ignores a blank search term', () => {
    expect(buildAlbumFilter({ q: '   ' }).$or).toBeUndefined();
  });
});
