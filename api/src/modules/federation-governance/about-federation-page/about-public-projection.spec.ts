import { Types } from 'mongoose';
import { projectAboutPage } from './about-public-projection.js';
import type { AboutLeader } from './about-public-projection.js';

/**
 * What a visitor is allowed to receive.
 *
 * The filtering happens here, on the server, and not in the page's markup:
 * a section an editor switched off must not reach the browser at all. Hiding
 * it in CSS would ship the federation's unfinished wording to anyone who opens
 * the network tab, and hiding it in React would still put it in the server-
 * rendered HTML.
 */

const pair = (value: string) => ({ ar: value, en: value });
const oid = () => new Types.ObjectId();

const milestone = (extra: Record<string, unknown> = {}) => ({
  _id: oid(),
  datePrecision: 'year',
  year: 1974,
  month: null,
  day: null,
  category: 'association',
  title: pair('m'),
  description: pair('d'),
  featured: false,
  imageId: null,
  isVisible: true,
  displayOrder: 0,
  ...extra,
});

const achievement = (extra: Record<string, unknown> = {}) => ({
  _id: oid(),
  year: 2014,
  place: pair('Incheon'),
  medalKind: 'gold',
  medalLabel: null,
  title: pair('a'),
  description: pair('d'),
  athleteId: null,
  imageId: null,
  isVisible: true,
  displayOrder: 0,
  ...extra,
});

const pioneer = (extra: Record<string, unknown> = {}) => ({
  _id: oid(),
  name: pair('n'),
  badge: pair('b'),
  description: pair('d'),
  imageId: null,
  featured: false,
  isVisible: true,
  displayOrder: 0,
  ...extra,
});

const fact = (extra: Record<string, unknown> = {}) => ({
  _id: oid(),
  value: '1974',
  badge: pair('April'),
  label: pair('l'),
  tone: 'green',
  isVisible: true,
  displayOrder: 0,
  ...extra,
});

const card = (extra: Record<string, unknown> = {}) => ({
  _id: oid(),
  title: pair('c'),
  text: pair('t'),
  tone: 'green',
  isVisible: true,
  displayOrder: 0,
  ...extra,
});

const leader = (extra: Partial<AboutLeader> = {}): AboutLeader => ({
  fullName: pair('President'),
  positionTitle: pair('President'),
  roleType: 'President',
  displayOrder: 0,
  photoId: null,
  ...extra,
});

/** A complete page: every section present, every list non-empty. */
const snapshot = (extra: Record<string, unknown> = {}) => ({
  hiddenSections: [],
  hero: { eyebrow: pair('e'), title: pair('t'), description: pair('d'), imageId: null },
  facts: { items: [fact(), fact()] },
  story: {
    eyebrow: pair('e'),
    title: pair('t'),
    paragraphs: [pair('p1'), pair('p2')],
    imageId: null,
    docCard: { label: pair('l'), title: pair('t'), date: pair('1974') },
  },
  timeline: { eyebrow: pair('e'), title: pair('t'), description: pair('d'), items: [milestone()] },
  achievements: { eyebrow: pair('e'), title: pair('t'), description: pair('d'), items: [achievement()] },
  pioneers: { eyebrow: pair('e'), title: pair('t'), items: [pioneer()] },
  leadership: { eyebrow: pair('e'), title: pair('t'), quote: pair('q'), priorities: [pair('1')] },
  governance: {
    eyebrow: pair('e'),
    title: pair('t'),
    description: pair('d'),
    cards: [card()],
    link: { label: pair('l'), href: '/about/governance/policies' },
  },
  ecosystem: { eyebrow: pair('e'), title: pair('t') },
  cta: {
    title: pair('t'),
    description: pair('d'),
    primary: { label: pair('p'), href: '/championships' },
    secondary: { label: pair('s'), href: '/contact' },
  },
  seo: { metaTitle: pair('t'), metaDescription: pair('d'), ogImageId: null },
  ...extra,
});

const counts = { clubs: 18, athletes: 1240, officials: 45, championships: null } as const;

const project = (extra: Record<string, unknown> = {}, options: Record<string, unknown> = {}) =>
  projectAboutPage(snapshot(extra), {
    isActive: true,
    counts,
    leaders: [leader()],
    publishedAt: new Date('2026-09-25T00:00:00Z'),
    ...options,
  });

describe('projectAboutPage — a page that is switched off', () => {
  it('answers with the switch alone, carrying none of the page', () => {
    const result = project({}, { isActive: false });

    expect(result).toEqual({ isActive: false });
  });
});

describe('projectAboutPage — a complete page', () => {
  it('prints all ten sections', () => {
    const result = project();

    for (const key of [
      'hero',
      'facts',
      'story',
      'timeline',
      'achievements',
      'pioneers',
      'leadership',
      'governance',
      'ecosystem',
      'cta',
    ]) {
      expect(result[key as keyof typeof result]).toBeTruthy();
    }
  });

  /** Bookkeeping is not content. An editor's switch positions and the
   *  ordering integers say nothing to a visitor and would describe the
   *  federation's unpublished intentions to anyone reading the response. */
  it('carries no editing bookkeeping into the response', () => {
    const serialised = JSON.stringify(project());

    expect(serialised).not.toContain('hiddenSections');
    expect(serialised).not.toContain('isVisible');
    expect(serialised).not.toContain('displayOrder');
  });
});

describe('projectAboutPage — a section an editor switched off', () => {
  it.each(['facts', 'story', 'timeline', 'achievements', 'pioneers', 'governance', 'cta'])(
    'leaves %s out entirely',
    (key) => {
      const result = project({ hiddenSections: [key] });

      expect(result[key as keyof typeof result]).toBeUndefined();
    },
  );

  it('keeps the rest of the page when one section is switched off', () => {
    const result = project({ hiddenSections: ['timeline'] });

    expect(result.timeline).toBeUndefined();
    expect(result.achievements).toBeTruthy();
    expect(result.hero).toBeTruthy();
  });
});

describe('projectAboutPage — items an editor hid', () => {
  it('drops a hidden milestone and keeps the visible ones', () => {
    const result = project({
      timeline: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        items: [milestone(), milestone({ isVisible: false }), milestone()],
      },
    });

    expect(result.timeline?.items).toHaveLength(2);
  });

  it('drops a hidden achievement, a hidden pioneer, a hidden fact and a hidden card', () => {
    const result = project({
      achievements: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        items: [achievement(), achievement({ isVisible: false })],
      },
      pioneers: { eyebrow: pair('e'), title: pair('t'), items: [pioneer(), pioneer({ isVisible: false })] },
      facts: { items: [fact(), fact({ isVisible: false })] },
      governance: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        cards: [card(), card({ isVisible: false })],
        link: { label: pair('l'), href: '/x' },
      },
    });

    expect(result.achievements?.items).toHaveLength(1);
    expect(result.pioneers?.items).toHaveLength(1);
    expect(result.facts?.items).toHaveLength(1);
    expect(result.governance?.cards).toHaveLength(1);
  });
});

/**
 * An undated milestone is withheld whatever its own switch says. The
 * federation documented the Basra championship but never confirmed its year,
 * and would rather print nothing than a guess — so "unknown" is the stronger
 * of the two signals, and an editor cannot publish it by flipping the switch.
 */
describe('projectAboutPage — a milestone whose date is not known', () => {
  it('withholds it even though the editor left it visible', () => {
    const result = project({
      timeline: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        items: [milestone(), milestone({ datePrecision: 'unknown', year: null, isVisible: true })],
      },
    });

    expect(result.timeline?.items).toHaveLength(1);
  });

  it('prints it as soon as its precision is raised and a year given', () => {
    const result = project({
      timeline: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        items: [milestone({ datePrecision: 'year', year: 1975 })],
      },
    });

    expect(result.timeline?.items).toHaveLength(1);
    expect(result.timeline?.items[0].year).toBe(1975);
  });
});

/**
 * `emptySectionAutoHide`. A heading with nothing under it is worse than no
 * section: it tells a visitor the federation has a timeline and then shows
 * them an empty band, and the scroll scene composed for it animates nothing.
 */
describe('projectAboutPage — a section left empty by its own filtering', () => {
  it('drops the timeline when every milestone was withheld', () => {
    const result = project({
      timeline: {
        eyebrow: pair('e'),
        title: pair('t'),
        description: pair('d'),
        items: [milestone({ isVisible: false }), milestone({ datePrecision: 'unknown', year: null })],
      },
    });

    expect(result.timeline).toBeUndefined();
  });

  it('drops the achievements, the pioneers and the facts when all their items are hidden', () => {
    const result = project({
      achievements: { eyebrow: pair('e'), title: pair('t'), description: pair('d'), items: [achievement({ isVisible: false })] },
      pioneers: { eyebrow: pair('e'), title: pair('t'), items: [pioneer({ isVisible: false })] },
      facts: { items: [fact({ isVisible: false })] },
    });

    expect(result.achievements).toBeUndefined();
    expect(result.pioneers).toBeUndefined();
    expect(result.facts).toBeUndefined();
  });

  /** The story has no list; its paragraphs are its content. */
  it('drops the story when it has no paragraphs', () => {
    const result = project({
      story: {
        eyebrow: pair('e'),
        title: pair('t'),
        paragraphs: [],
        imageId: null,
        docCard: { label: pair('l'), title: pair('t'), date: pair('d') },
      },
    });

    expect(result.story).toBeUndefined();
  });
});

describe('projectAboutPage — the two automatic sections', () => {
  it('drops the leadership when the board module lists nobody in the current cycle', () => {
    const result = project({}, { leaders: [] });

    expect(result.leadership).toBeUndefined();
  });

  it('prints the leadership with the people its own module holds, in their order', () => {
    const result = project(
      {},
      {
        leaders: [
          leader({ fullName: pair('Second'), roleType: 'BoardMember', displayOrder: 2 }),
          leader({ fullName: pair('First'), roleType: 'President', displayOrder: 1 }),
        ],
      },
    );

    expect(result.leadership?.people.map((person) => person.fullName.en)).toEqual(['First', 'Second']);
  });

  it('drops the ecosystem when no source could be counted', () => {
    const result = project(
      {},
      { counts: { clubs: null, athletes: null, officials: null, championships: null } },
    );

    expect(result.ecosystem).toBeUndefined();
  });

  it('prints only the tiles that have a number, so an absent source leaves no gap', () => {
    const result = project();

    expect(result.ecosystem?.stats.map((stat) => stat.key)).toEqual(['clubs', 'athletes', 'officials']);
  });

  it('keeps a source that counted zero: none is a fact, unknown is not', () => {
    const result = project(
      {},
      { counts: { clubs: 0, athletes: null, officials: null, championships: null } },
    );

    expect(result.ecosystem?.stats).toEqual([{ key: 'clubs', value: 0 }]);
  });
});
