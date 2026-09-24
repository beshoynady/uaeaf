import { CAROUSEL_COUNTS, DEFAULT_CAROUSEL_COUNT, readVideoSectionSettings } from './video-settings.js';

/**
 * The VIDEO_LIBRARY section's own settings, read out of `pageSections`'
 * free-form `configuration`.
 *
 * Free-form means anything can be in there: a half-saved draft, a key from an
 * older shape, a hand-edited document. So this reader never trusts what it
 * finds — every value is checked and every unusable one falls back to the
 * default. The section renders on the homepage, and a malformed configuration
 * must degrade to the default section rather than take the page down.
 */
describe('readVideoSectionSettings', () => {
  it('falls back to the documented defaults when nothing is configured', () => {
    const settings = readVideoSectionSettings(null);

    expect(settings.featured.mode).toBe('latest');
    expect(settings.carousel.source).toBe('latest');
    expect(settings.carousel.count).toBe(DEFAULT_CAROUSEL_COUNT);
    // Reels are vertical; the carousel is a horizontal row. Including them by
    // default would crop somebody's video on the homepage.
    expect(settings.carousel.includeReels).toBe(false);
  });

  it('offers exactly the counts the design names', () => {
    expect(CAROUSEL_COUNTS).toEqual([4, 6, 8, 10, 12]);
    expect(DEFAULT_CAROUSEL_COUNT).toBe(8);
  });

  it.each([4, 6, 8, 10, 12])('keeps the offered count %s', (count) => {
    expect(readVideoSectionSettings({ carousel: { count } }).carousel.count).toBe(count);
  });

  it.each([0, 3, 7, 13, 100, -8, 1.5, Number.NaN])('refuses the count %s and uses the default', (count) => {
    // Not clamped to the nearest: 7 is not a count this design has a layout
    // for, and silently rendering 6 or 8 would misreport what was saved.
    expect(readVideoSectionSettings({ carousel: { count } }).carousel.count).toBe(DEFAULT_CAROUSEL_COUNT);
  });

  it('reads a specific featured video', () => {
    const settings = readVideoSectionSettings({ featured: { mode: 'specific', videoId: '66f0a1b2c3d4e5f60718293a' } });

    expect(settings.featured).toEqual({ mode: 'specific', videoId: '66f0a1b2c3d4e5f60718293a' });
  });

  it('falls back to latest when specific names no video', () => {
    // A half-saved form: the mode was switched but the picker never used. The
    // homepage must still have a featured video.
    expect(readVideoSectionSettings({ featured: { mode: 'specific' } }).featured.mode).toBe('latest');
    expect(readVideoSectionSettings({ featured: { mode: 'specific', videoId: 'nonsense' } }).featured.mode).toBe(
      'latest',
    );
  });

  it('reads a filtered carousel by category and season', () => {
    const settings = readVideoSectionSettings({
      carousel: { source: 'filtered', category: 'championships', season: '2025–2026' },
    });

    expect(settings.carousel.source).toBe('filtered');
    expect(settings.carousel.category).toBe('championships');
    expect(settings.carousel.season).toBe('2025–2026');
  });

  it('reads a filtered carousel by association', () => {
    const settings = readVideoSectionSettings({
      carousel: { source: 'filtered', association: 'championships:66f0a1b2c3d4e5f60718293a' },
    });

    expect(settings.carousel.association).toBe('championships:66f0a1b2c3d4e5f60718293a');
  });

  it('drops a category that is not one of the closed list', () => {
    expect(readVideoSectionSettings({ carousel: { source: 'filtered', category: 'made-up' } }).carousel.category).toBe(
      null,
    );
  });

  it('keeps the order of a manual selection', () => {
    // The editor arranged these by hand; any reordering here would silently
    // disagree with what the dashboard shows.
    const manualIds = ['66f0a1b2c3d4e5f60718293a', '66f0a1b2c3d4e5f60718293b'];

    expect(readVideoSectionSettings({ carousel: { source: 'manual', manualIds } }).carousel.manualIds).toEqual(
      manualIds,
    );
  });

  it('drops ids from a manual selection that are not ids at all', () => {
    const settings = readVideoSectionSettings({
      carousel: { source: 'manual', manualIds: ['66f0a1b2c3d4e5f60718293a', 'nonsense', 42] },
    });

    expect(settings.carousel.manualIds).toEqual(['66f0a1b2c3d4e5f60718293a']);
  });

  it('survives a configuration of the wrong shape entirely', () => {
    for (const nonsense of [undefined, 'a string', 42, [], { carousel: 'not an object' }]) {
      expect(readVideoSectionSettings(nonsense as never).carousel.count).toBe(DEFAULT_CAROUSEL_COUNT);
    }
  });
});
