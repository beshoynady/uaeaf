import { model as createModel } from 'mongoose';
import { VIDEO_TITLE_MAX_LENGTH, VideoSchema } from './video.schema.js';

/**
 * The video record's own rules, checked without a database.
 *
 * A video is a link to somebody else's platform plus the federation's own
 * words about it. What matters here is that a row cannot exist in a state the
 * public site would have to guess about: a platform nothing can embed, a
 * category nothing can filter, or a "published" row with no date to order it
 * by.
 */
// Registered under its own name so this file never collides with the model the
// application registers as `Video`.
const model = createModel('VideoSchemaSpec', VideoSchema);

const base = {
  title: { ar: 'سباق 100 متر', en: '100m final' },
  externalUrl: 'https://www.youtube.com/watch?v=abc',
  externalPlatform: 'youtube',
  externalId: 'abc',
  category: 'championships',
};

describe('Video schema', () => {
  it('starts a new video as an unpublished draft with no publication date', async () => {
    const doc = new model(base);

    await doc.validate();

    expect(doc.status).toBe('draft');
    expect(doc.kind).toBe('video');
    expect(doc.publishedAt).toBeNull();
  });

  it('refuses a category outside the closed list', async () => {
    await expect(new model({ ...base, category: 'made-up' }).validate()).rejects.toThrow(/category/);
  });

  it('refuses a platform the allowlist cannot resolve', async () => {
    // `Other` was in the old enum. Nothing can resolve a link on an unnamed
    // platform and nothing can embed it, so it cannot be stored either.
    await expect(new model({ ...base, externalPlatform: 'Other' }).validate()).rejects.toThrow(
      /externalPlatform/,
    );
  });

  it.each(['youtube', 'instagram', 'tiktok', 'x', 'facebook'])('accepts the platform %s', async (platform) => {
    await expect(new model({ ...base, externalPlatform: platform }).validate()).resolves.toBeUndefined();
  });

  it('carries no order field — the library is ordered by publication date', () => {
    // Manual ordering lives in `pageSections.items[]`, which is the one place
    // an editor arranges videos by hand (the carousel's manual source). A
    // second ordering on the record itself would silently disagree with it.
    expect(model.schema.path('order')).toBeUndefined();
  });

  it('carries no contentCategoryId — it pointed at a collection that was never built', () => {
    expect(model.schema.path('contentCategoryId')).toBeUndefined();
  });

  it('refuses a title longer than the cap, in either language', async () => {
    // The title arrives from a third party's oEmbed reply, so its length is
    // not something an editor chose. Without a ceiling a hostile or broken
    // platform stores a novel in a field the card renders.
    const tooLong = 'x'.repeat(VIDEO_TITLE_MAX_LENGTH + 1);

    await expect(new model({ ...base, title: { ar: tooLong, en: 'ok' } }).validate()).rejects.toThrow(/title/);
    await expect(new model({ ...base, title: { ar: 'ok', en: tooLong } }).validate()).rejects.toThrow(/title/);
  });

  it('accepts a title exactly at the cap', async () => {
    const atLimit = 'x'.repeat(VIDEO_TITLE_MAX_LENGTH);

    await expect(new model({ ...base, title: { ar: atLimit, en: atLimit } }).validate()).resolves.toBeUndefined();
  });

  it('keeps the reel distinction independent of the platform', async () => {
    const reel = new model({ ...base, externalPlatform: 'youtube', kind: 'reel' });

    await reel.validate();

    expect(reel.kind).toBe('reel');
  });
});
