import type { AboutFederationCounts } from './about-federation-stats.service.js';
import { ABOUT_SECTION_KEYS } from './schemas/about-sections.schema.js';
import type { AboutSectionKey } from './schemas/about-sections.schema.js';

/**
 * What a visitor receives, built from a published snapshot.
 *
 * A pure function, deliberately: every rule about what reaches the public page
 * is decided here, once, and can be read and tested without a database, a
 * publication or a request. The service around it does the fetching.
 *
 * ── Why the filtering is here and not in the page ─────────────────────────
 *
 * A section an editor switched off must not reach the browser at all. Hidden
 * in CSS it is still in the markup; skipped in React it is still in the
 * server-rendered HTML. Either way the federation's unfinished wording is one
 * "view source" away. So the response simply does not contain it, and the page
 * has nothing to hide.
 */

type Localized = { ar: string; en: string };

/** Anything an editor can switch off, one at a time. */
type Hideable = { isVisible?: boolean };

/** A person as the board module hands them over, already scoped to the
 *  current cycle and ordered. */
export interface AboutLeader {
  fullName: Localized;
  positionTitle: Localized;
  roleType: string;
  displayOrder: number;
  photoId: string | null;
}

/** The same person as the page prints them: the ordering integer has done its
 *  work by then and is not a visitor's business. */
export type AboutLeaderPublic = Omit<AboutLeader, 'displayOrder'>;

export interface AboutStat {
  key: 'clubs' | 'athletes' | 'officials' | 'championships';
  value: number;
}

export interface AboutPublicPage {
  isActive: boolean;
  publishedAt?: Date;
  hero?: Record<string, unknown>;
  facts?: { items: Record<string, unknown>[] };
  story?: Record<string, unknown>;
  timeline?: Record<string, unknown> & { items: Record<string, unknown>[] };
  achievements?: Record<string, unknown> & { items: Record<string, unknown>[] };
  pioneers?: Record<string, unknown> & { items: Record<string, unknown>[] };
  leadership?: Record<string, unknown> & { people: AboutLeaderPublic[] };
  governance?: Record<string, unknown> & { cards: Record<string, unknown>[] };
  ecosystem?: Record<string, unknown> & { stats: AboutStat[] };
  cta?: Record<string, unknown>;
  seo?: Record<string, unknown>;
}

export interface ProjectionContext {
  /** Read from the row, not the snapshot: the switch is never frozen into a
   *  revision (see the schema's note on `isActive`). */
  isActive: boolean;
  counts: AboutFederationCounts;
  /** Already filtered to the current cycle by the appointments module. */
  leaders: AboutLeader[];
  publishedAt: Date;
}

/** An item prints unless the editor hid it. A row stored before the flag
 *  existed carries none and stays visible. */
const visible = (item: Hideable): boolean => item.isVisible !== false;

/** The bookkeeping every stored list item carries and no visitor needs. */
const STRIPPED = ['isVisible', 'displayOrder', '__v'] as const;

const clean = <T extends Record<string, unknown>>(item: T): Record<string, unknown> => {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (!(STRIPPED as readonly string[]).includes(key)) {
      copy[key] = value;
    }
  }
  return copy;
};

const shown = (items: unknown): Record<string, unknown>[] =>
  Array.isArray(items) ? items.filter((item) => visible(item as Hideable)).map((item) => clean(item as Record<string, unknown>)) : [];

/**
 * A milestone prints only when the federation knows when it happened.
 *
 * `unknown` beats the editor's own switch: the Basra championship is
 * documented but undated, and the page would otherwise print a card with a
 * blank where its date belongs. Raising the precision and giving a year is the
 * only way it appears — which is exactly the promise the editor is shown.
 */
const dated = (item: Record<string, unknown>): boolean => item.datePrecision !== 'unknown';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export const projectAboutPage = (
  snapshot: Record<string, unknown>,
  context: ProjectionContext,
): AboutPublicPage => {
  // A page that is switched off answers with the switch and nothing else. The
  // visitor gets the "in preparation" screen, and the draft stays private
  // whatever state the review left it in.
  if (!context.isActive) {
    return { isActive: false };
  }

  const hidden = new Set(
    Array.isArray(snapshot.hiddenSections) ? (snapshot.hiddenSections as AboutSectionKey[]) : [],
  );
  const page: AboutPublicPage = { isActive: true, publishedAt: context.publishedAt };

  const wanted = (key: AboutSectionKey): boolean => !hidden.has(key);

  const hero = asRecord(snapshot.hero);
  if (hero) {
    page.hero = clean(hero);
  }

  if (wanted('facts')) {
    const facts = asRecord(snapshot.facts);
    const items = shown(facts?.items);
    // `emptySectionAutoHide`: a band with no cards in it is worse than no
    // band — the scroll scene composed for it would animate nothing.
    if (items.length > 0) {
      page.facts = { items };
    }
  }

  if (wanted('story')) {
    const story = asRecord(snapshot.story);
    const paragraphs = Array.isArray(story?.paragraphs) ? story.paragraphs : [];
    // The story has no list to empty; its paragraphs are its content.
    if (story && paragraphs.length > 0) {
      page.story = clean(story);
    }
  }

  if (wanted('timeline')) {
    const timeline = asRecord(snapshot.timeline);
    const items = shown(timeline?.items).filter(dated);
    if (timeline && items.length > 0) {
      page.timeline = { ...clean(timeline), items };
    }
  }

  if (wanted('achievements')) {
    const achievements = asRecord(snapshot.achievements);
    const items = shown(achievements?.items);
    if (achievements && items.length > 0) {
      page.achievements = { ...clean(achievements), items };
    }
  }

  if (wanted('pioneers')) {
    const pioneers = asRecord(snapshot.pioneers);
    const items = shown(pioneers?.items);
    if (pioneers && items.length > 0) {
      page.pioneers = { ...clean(pioneers), items };
    }
  }

  // Automatic: it answers to the board module, not to a switch. Nobody
  // appointed in the current cycle means there is no leadership to show, and a
  // quote with no one to attribute it to is not a section.
  const leadership = asRecord(snapshot.leadership);
  if (leadership && context.leaders.length > 0) {
    // Sorted by `displayOrder`, then printed without it: the board's chosen
    // order is the array's order from here on, and the integer itself is the
    // board module's bookkeeping, not something a visitor is told.
    const people = [...context.leaders]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(({ displayOrder, ...person }) => {
        void displayOrder;
        return person;
      });
    page.leadership = { ...clean(leadership), people };
  }

  if (wanted('governance')) {
    const governance = asRecord(snapshot.governance);
    const cards = shown(governance?.cards);
    if (governance && cards.length > 0) {
      page.governance = { ...clean(governance), cards };
    }
  }

  // Automatic in the same way: the numbers are counted, so the section exists
  // exactly when at least one of them could be. A source that answered `null`
  // leaves no tile behind rather than printing a placeholder.
  const ecosystem = asRecord(snapshot.ecosystem);
  if (ecosystem) {
    const stats = (Object.entries(context.counts) as [AboutStat['key'], number | null][])
      .filter((entry): entry is [AboutStat['key'], number] => entry[1] !== null)
      .map(([key, value]) => ({ key, value }));
    if (stats.length > 0) {
      page.ecosystem = { ...clean(ecosystem), stats };
    }
  }

  if (wanted('cta')) {
    const cta = asRecord(snapshot.cta);
    if (cta) {
      page.cta = clean(cta);
    }
  }

  const seo = asRecord(snapshot.seo);
  if (seo) {
    page.seo = clean(seo);
  }

  return page;
};

/** The order the page prints, for any reader that needs it without importing
 *  the schema. Exported here so the response and the page agree on one list. */
export const PUBLIC_SECTION_ORDER = ABOUT_SECTION_KEYS;
