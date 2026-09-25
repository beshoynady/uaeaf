import { attachImages, collectImageIds } from './about-images.js';

/**
 * Every picture on this page is a record field, and the page prints it by
 * resolving that id to a public image. The two steps are separated so the
 * resolution happens once for the whole page — a milestone list of six would
 * otherwise be six lookups — and so an id that resolves to nothing leaves a
 * `null` the page can draw its own placeholder for, rather than a broken
 * `<img>`.
 */

const asset = (id: string) => ({ id, url: `https://cdn/${id}`, width: 100, height: 100, alt: { ar: 'ص', en: 'i' } });

const page = () => ({
  isActive: true,
  hero: { title: { ar: 't', en: 't' }, imageId: 'a1' },
  story: { paragraphs: [], imageId: 'a2', docCard: {} },
  timeline: { items: [{ _id: 'm1', imageId: 'a3' }, { _id: 'm2', imageId: null }] },
  achievements: { items: [{ _id: 'x1', imageId: 'a4' }] },
  pioneers: { items: [{ _id: 'p1', imageId: 'a5' }] },
  seo: { ogImageId: 'a6' },
});

describe('collectImageIds', () => {
  it('finds every picture the page prints, in one pass', () => {
    expect(collectImageIds(page()).sort()).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
  });

  it('skips empty slots rather than looking them up', () => {
    expect(collectImageIds(page())).not.toContain(null);
  });

  it('asks for each id once, however many places use it', () => {
    const reused = { hero: { imageId: 'same' }, story: { imageId: 'same', paragraphs: [] } };

    expect(collectImageIds(reused)).toEqual(['same']);
  });
});

describe('attachImages', () => {
  const resolved = new Map([
    ['a1', asset('a1')],
    ['a3', asset('a3')],
  ]);

  it('replaces the id with the resolved picture where one exists', () => {
    const result = attachImages(page(), resolved) as Record<string, any>;

    expect(result.hero.image).toEqual(asset('a1'));
    expect(result.timeline.items[0].image).toEqual(asset('a3'));
  });

  it('leaves null where the id resolved to nothing, so the page draws its own placeholder', () => {
    const result = attachImages(page(), resolved) as Record<string, any>;

    expect(result.story.image).toBeNull();
    expect(result.achievements.items[0].image).toBeNull();
  });

  it('leaves null for a slot that was empty to begin with', () => {
    const result = attachImages(page(), resolved) as Record<string, any>;

    expect(result.timeline.items[1].image).toBeNull();
  });

  /** The raw id is internal: a visitor gets a URL, not a database key. */
  it('carries no imageId into the result', () => {
    expect(JSON.stringify(attachImages(page(), resolved))).not.toContain('imageId');
  });

  it('resolves the share image the same way', () => {
    const result = attachImages(page(), new Map([['a6', asset('a6')]])) as Record<string, any>;

    expect(result.seo.ogImage).toEqual(asset('a6'));
    expect(JSON.stringify(result)).not.toContain('ogImageId');
  });
});
