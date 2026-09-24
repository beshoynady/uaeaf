import { SEASON_START_MONTH, seasonLabel, seasonRange } from './season.js';

/**
 * An athletics season, derived rather than stored.
 *
 * There is no season entity in this platform and none is being added, so a
 * video's season is computed from the one date that already means something:
 * `publishedAt`. Deriving it has a property a second stored field could not
 * have — it can never disagree with the publication date the library is
 * ordered by.
 *
 * The season runs September→August (`SEASON_START_MONTH = 9`), so the
 * interesting cases are the two days either side of the boundary, which is
 * where an off-by-one lands a March video in the wrong year.
 */
describe('season', () => {
  it('starts in September, which is what SEASON_START_MONTH says', () => {
    expect(SEASON_START_MONTH).toBe(9);
  });

  describe('seasonLabel', () => {
    it.each([
      ['2025-09-01T00:00:00.000Z', '2025–2026'],
      ['2025-12-31T23:59:59.000Z', '2025–2026'],
      ['2026-03-14T12:00:00.000Z', '2025–2026'],
      ['2026-08-31T23:59:59.000Z', '2025–2026'],
      ['2026-09-01T00:00:00.000Z', '2026–2027'],
    ])('puts %s in %s', (iso, label) => {
      expect(seasonLabel(new Date(iso))).toBe(label);
    });

    it('does not straddle the boundary by a day in either direction', () => {
      expect(seasonLabel(new Date('2026-08-31T23:59:59.999Z'))).toBe('2025–2026');
      expect(seasonLabel(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026–2027');
    });
  });

  describe('seasonRange', () => {
    it('turns a label into a half-open range over publishedAt', () => {
      const range = seasonRange('2025–2026');

      expect(range).not.toBeNull();
      expect(range!.from.toISOString()).toBe('2025-09-01T00:00:00.000Z');
      // Half-open: the upper bound is the next season's first instant, so no
      // video can fall between two seasons or into both.
      expect(range!.to.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    });

    it('round-trips every label it produces', () => {
      for (const iso of ['2025-09-01T00:00:00.000Z', '2026-03-14T12:00:00.000Z', '2026-08-31T23:00:00.000Z']) {
        const date = new Date(iso);
        const range = seasonRange(seasonLabel(date))!;

        expect(date >= range.from).toBe(true);
        expect(date < range.to).toBe(true);
      }
    });

    it.each([
      '2025',
      '2025-2026', // hyphen-minus, not the en dash the label uses
      '2026–2025', // backwards
      '2025–2027', // not consecutive
      'abcd–efgh',
      '',
      // A filter value arrives from a query string, so it is user input and
      // gets the same refusal any other unparseable input would.
      "2025–2026'; drop",
    ])('refuses the label %s', (label) => {
      expect(seasonRange(label)).toBeNull();
    });
  });
});
