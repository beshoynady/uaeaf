import { Types } from 'mongoose';
import { attachImages, collectImageIds } from './about-images.js';

/**
 * Every picture on this page is a record field, and the page prints it by
 * resolving that id to a public image. The two steps are separated so the
 * resolution happens once for the whole page — a milestone list of six would
 * otherwise be six lookups — and so an id that resolves to nothing leaves a
 * `null` the page can draw its own placeholder for, rather than a broken
 * `<img>`.
 */

/** Exactly what `MediaAssetsService.resolvePublicImages` returns — `altText`,
 *  and no id. A fixture that invented a friendlier shape is how the page came
 *  to read a field the API never sends. */
const asset = (id: string) => ({ url: `https://cdn/${id}`, width: 100, height: 100, altText: { ar: 'ص', en: 'i' } });

const page = () => ({
  isActive: true,
  hero: { title: { ar: 't', en: 't' }, imageId: 'a1' },
  story: { paragraphs: [], imageId: 'a2', docCard: {} },
  timeline: { items: [{ _id: 'm1', imageId: 'a3' }, { _id: 'm2', imageId: null }] },
  achievements: { items: [{ _id: 'x1', imageId: 'a4' }] },
  leadership: { people: [{ fullName: { ar: 'ر', en: 'P' }, photoId: 'a7' }, { fullName: { ar: 'ع', en: 'M' }, photoId: null }] },
  pioneers: { items: [{ _id: 'p1', imageId: 'a5' }] },
  seo: { ogImageId: 'a6' },
});

describe('collectImageIds', () => {
  it('finds every picture the page prints, in one pass', () => {
    expect(collectImageIds(page()).sort()).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  });

  /** The board's portraits arrive from the appointments module rather than
   *  from this record, and were the one kind of picture this pass used to walk
   *  past — leaving every leader card drawn as an empty circle. */
  it("finds the board's portraits, which arrive from another module", () => {
    expect(collectImageIds(page())).toContain('a7');
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

  it('puts a resolved portrait on the person it belongs to', () => {
    const result = attachImages(page(), new Map([['a7', asset('a7')]])) as Record<string, any>;

    expect(result.leadership.people[0].photo).toEqual(asset('a7'));
    expect(result.leadership.people[1].photo).toBeNull();
    expect(JSON.stringify(result)).not.toContain('photoId');
  });

  it('resolves the share image the same way', () => {
    const result = attachImages(page(), new Map([['a6', asset('a6')]])) as Record<string, any>;

    expect(result.seo.ogImage).toEqual(asset('a6'));
    expect(JSON.stringify(result)).not.toContain('ogImageId');
  });
});

/**
 * A published snapshot is a database read, so its values are BSON — and the
 * first version of this pass deep-copied the page with `structuredClone`,
 * which throws `DataCloneError` on an `ObjectId`.
 *
 * Every test above passed, because a hand-written fixture holds plain strings.
 * The failure needed a real publication to appear, and then it was a 500 on
 * the page itself. These cases carry the values a snapshot actually carries.
 */
describe('attachImages — a page as it comes out of the database', () => {
  const stored = () => ({
    isActive: true,
    publishedAt: new Date('2026-09-26T00:00:00Z'),
    hero: { title: { ar: 'ت', en: 't' }, imageId: new Types.ObjectId() },
    timeline: {
      items: [{ _id: new Types.ObjectId(), imageId: null, year: 1974 }],
    },
    leadership: { people: [{ fullName: { ar: 'ر', en: 'P' }, photoId: new Types.ObjectId() }] },
    seo: { ogImageId: null },
  });

  it('copies a page carrying ObjectId and Date values instead of throwing', () => {
    expect(() => attachImages(stored(), new Map())).not.toThrow();
  });

  it('collects the ids as strings, whatever type they are stored as', () => {
    const page = stored();
    const ids = collectImageIds(page);

    expect(ids).toHaveLength(2);
    expect(ids.every((id) => typeof id === 'string')).toBe(true);
  });

  it('leaves the values it does not swap exactly as they were', () => {
    const page = stored();
    const result = attachImages(page, new Map()) as Record<string, any>;

    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(result.timeline.items[0].year).toBe(1974);
    expect(result.timeline.items[0]._id).toBeInstanceOf(Types.ObjectId);
  });

  it('does not write through to the page it was given', () => {
    const page = stored();
    attachImages(page, new Map());

    expect('imageId' in page.hero).toBe(true);
  });
});
