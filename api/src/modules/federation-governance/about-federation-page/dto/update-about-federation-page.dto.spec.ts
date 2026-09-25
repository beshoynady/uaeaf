import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAboutFederationPageDto } from './update-about-federation-page.dto.js';

/**
 * Checked through the same pipeline the global `ValidationPipe` runs, so a
 * field the DTO does not declare is refused here exactly as it would be on the
 * wire.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(UpdateAboutFederationPageDto, body), { whitelist: true, forbidNonWhitelisted: true });

const pair = { en: 'Text', ar: 'نص' };

const milestone = (extra: Record<string, unknown> = {}) => ({
  datePrecision: 'year',
  year: 1974,
  category: 'association',
  title: pair,
  description: pair,
  ...extra,
});

describe('UpdateAboutFederationPageDto — what may be hidden', () => {
  it.each(['facts', 'story', 'timeline', 'achievements', 'pioneers', 'governance', 'cta'])(
    'lets an editor hide %s',
    async (key) => {
      expect(await errorsOf({ hiddenSections: [key] })).toHaveLength(0);
    },
  );

  // ADR-0101: a page with no header is not a page, and the two automatic
  // sections answer to their source rather than to a switch.
  it.each(['hero', 'leadership', 'ecosystem'])('refuses to hide %s', async (key) => {
    expect(await errorsOf({ hiddenSections: [key] })).not.toHaveLength(0);
  });

  it('refuses a section name that does not exist', async () => {
    expect(await errorsOf({ hiddenSections: ['sponsors'] })).not.toHaveLength(0);
  });
});

describe('UpdateAboutFederationPageDto — the page state is not an editor field', () => {
  it.each(['isActive', 'publicationState', 'sectionOrder'])('refuses %s', async (field) => {
    expect(await errorsOf({ [field]: true })).not.toHaveLength(0);
  });
});

/**
 * A milestone carries exactly the date parts its precision claims. Without
 * this, "year" with no year reaches the page as a card with a blank date, and
 * a "full date" carrying only a year prints a day the federation never
 * confirmed.
 */
describe('UpdateAboutFederationPageDto — date precision decides which parts are required', () => {
  const timelineOf = (item: Record<string, unknown>) => ({ timeline: { items: [item] } });

  it('takes a year when the precision is the year', async () => {
    expect(await errorsOf(timelineOf(milestone()))).toHaveLength(0);
  });

  it('refuses a year precision with no year', async () => {
    expect(await errorsOf(timelineOf(milestone({ year: undefined })))).not.toHaveLength(0);
  });

  it('refuses a month-and-year precision with no month', async () => {
    expect(await errorsOf(timelineOf(milestone({ datePrecision: 'monthYear' })))).not.toHaveLength(0);
  });

  it('takes a month-and-year precision carrying both', async () => {
    expect(await errorsOf(timelineOf(milestone({ datePrecision: 'monthYear', month: 4 })))).toHaveLength(0);
  });

  it('refuses a full date missing its day', async () => {
    expect(await errorsOf(timelineOf(milestone({ datePrecision: 'fullDate', month: 1 })))).not.toHaveLength(0);
  });

  it('takes a full date carrying all three parts', async () => {
    expect(
      await errorsOf(timelineOf(milestone({ datePrecision: 'fullDate', month: 1, day: 15 }))),
    ).toHaveLength(0);
  });

  it('takes an unknown date carrying no parts at all', async () => {
    expect(
      await errorsOf(timelineOf({ ...milestone(), datePrecision: 'unknown', year: undefined })),
    ).toHaveLength(0);
  });

  it('refuses a month outside the calendar', async () => {
    expect(
      await errorsOf(timelineOf(milestone({ datePrecision: 'monthYear', month: 13 }))),
    ).not.toHaveLength(0);
  });
});

describe('UpdateAboutFederationPageDto — pioneers', () => {
  const pioneer = (extra: Record<string, unknown> = {}) => ({
    name: pair,
    badge: pair,
    description: pair,
    ...extra,
  });

  it('takes one featured pioneer: the approved composition has one wide card', async () => {
    expect(
      await errorsOf({ pioneers: { items: [pioneer({ featured: true }), pioneer()] } }),
    ).toHaveLength(0);
  });

  it('refuses a second featured pioneer, which has nowhere to be drawn', async () => {
    expect(
      await errorsOf({ pioneers: { items: [pioneer({ featured: true }), pioneer({ featured: true })] } }),
    ).not.toHaveLength(0);
  });
});

describe('UpdateAboutFederationPageDto — achievements', () => {
  const achievement = (extra: Record<string, unknown> = {}) => ({
    year: 2014,
    place: pair,
    medalKind: 'gold',
    title: pair,
    description: pair,
    ...extra,
  });

  it('takes an achievement with no free label: the kind names itself', async () => {
    expect(await errorsOf({ achievements: { items: [achievement()] } })).toHaveLength(0);
  });

  it('takes a free label beside the kind, for a haul the kinds cannot name', async () => {
    expect(
      await errorsOf({ achievements: { items: [achievement({ medalLabel: pair })] } }),
    ).toHaveLength(0);
  });

  it('refuses a medal kind outside the four', async () => {
    expect(
      await errorsOf({ achievements: { items: [achievement({ medalKind: 'platinum' })] } }),
    ).not.toHaveLength(0);
  });
});

/**
 * A link's words are a bilingual pair, not a string.
 *
 * Declared only as "a string" the label would pass validation as `"Policies"`
 * and reach the schema as a `LocalizedText`, where it fails far from the
 * editor who typed it — and an English-only label would be accepted outright.
 */
describe('UpdateAboutFederationPageDto — a link label is validated as a bilingual pair', () => {
  const withLink = (link: unknown) => ({ cta: { primary: link } });

  it('takes a label carrying both languages', async () => {
    expect(await errorsOf(withLink({ label: pair, href: '/championships' }))).toHaveLength(0);
  });

  it('refuses a label given as a bare string', async () => {
    expect(await errorsOf(withLink({ label: 'Championships', href: '/championships' }))).not.toHaveLength(0);
  });

  it('refuses a label missing its Arabic half', async () => {
    expect(await errorsOf(withLink({ label: { en: 'Championships' }, href: '/x' }))).not.toHaveLength(0);
  });

  it('refuses a link with no label at all', async () => {
    expect(await errorsOf(withLink({ href: '/championships' }))).not.toHaveLength(0);
  });
});

/**
 * An editor writes these, and a visitor clicks them. A `javascript:` href runs
 * in the site's own origin, which would make "may edit the About page" mean
 * "may run script against every visitor".
 */
describe('UpdateAboutFederationPageDto — where a link may point', () => {
  const withHref = (href: string) => ({ cta: { primary: { label: pair, href } } });

  it.each(['/championships', '/', '/about/governance/policies', 'https://worldathletics.org'])(
    'takes %s',
    async (href) => {
      expect(await errorsOf(withHref(href))).toHaveLength(0);
    },
  );

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    '//evil.example',
    'http://insecure.example',
    'championships',
    '',
  ])('refuses %s', async (href) => {
    expect(await errorsOf(withHref(href))).not.toHaveLength(0);
  });

  it('refuses a dangerous href on the governance link too, not just the call to action', async () => {
    expect(
      await errorsOf({
        governance: { link: { label: pair, href: 'javascript:alert(1)' } },
      }),
    ).not.toHaveLength(0);
  });
});

describe('UpdateAboutFederationPageDto — length limits', () => {
  const long = (n: number) => ({ en: 'x'.repeat(n), ar: 'x'.repeat(n) });

  it('refuses a title past the limit the card can draw', async () => {
    expect(await errorsOf({ hero: { title: long(200) } })).not.toHaveLength(0);
  });

  it('refuses a description past the limit the card can draw', async () => {
    expect(await errorsOf({ hero: { description: long(900) } })).not.toHaveLength(0);
  });
});
