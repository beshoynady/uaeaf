import { Types } from 'mongoose';
import {
  DEFAULT_GALLERY_COUNT,
  GALLERY_COUNTS,
  readPhotoGallerySettings,
} from './photo-gallery-settings.js';

/**
 * `configuration` is `Mixed`, so everything this reader can be handed is
 * something it can actually be handed: a half-saved draft, a key from an
 * older shape, a hand-edited document. The section renders on the homepage,
 * so the worst outcome of any of them must be the default section.
 */
describe('readPhotoGallerySettings', () => {
  const id = () => new Types.ObjectId().toString();

  it('reads a well-formed configuration', () => {
    const albumIds = [id(), id()];

    expect(readPhotoGallerySettings({ enabled: true, mode: 'manual', count: 6, albumIds })).toEqual({
      enabled: true,
      mode: 'manual',
      count: 6,
      albumIds,
    });
  });

  it.each([null, undefined, 'nonsense', 42, []])('falls back to defaults for %p', (configuration) => {
    expect(readPhotoGallerySettings(configuration)).toEqual({
      enabled: true,
      mode: 'latest',
      count: DEFAULT_GALLERY_COUNT,
      albumIds: [],
    });
  });

  it('treats an absent switch as on, because a row exists to be shown', () => {
    expect(readPhotoGallerySettings({}).enabled).toBe(true);
  });

  it('treats only an explicit false as off', () => {
    expect(readPhotoGallerySettings({ enabled: false }).enabled).toBe(false);
    expect(readPhotoGallerySettings({ enabled: 'false' }).enabled).toBe(true);
  });

  it('accepts every count the design lays out', () => {
    for (const count of GALLERY_COUNTS) {
      expect(readPhotoGallerySettings({ count }).count).toBe(count);
    }
  });

  it('refuses a count the design has no layout for, rather than rounding it', () => {
    // 9 is not a layout this section has; quietly drawing 8 would misreport
    // what the editor saved.
    expect(readPhotoGallerySettings({ count: 9 }).count).toBe(DEFAULT_GALLERY_COUNT);
    expect(readPhotoGallerySettings({ count: 2 }).count).toBe(DEFAULT_GALLERY_COUNT);
    expect(readPhotoGallerySettings({ count: '6' }).count).toBe(DEFAULT_GALLERY_COUNT);
  });

  it('keeps only well-formed ids, in the order the editor arranged them', () => {
    const first = id();
    const second = id();

    expect(readPhotoGallerySettings({ albumIds: [first, 'broken', second] }).albumIds).toEqual([first, second]);
  });

  it('reads an unknown mode as latest', () => {
    expect(readPhotoGallerySettings({ mode: 'shuffle' }).mode).toBe('latest');
  });
});
