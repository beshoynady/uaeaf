import mongoose from 'mongoose';
import {
  ABOUT_SECTION_KEYS,
  DATE_PRECISIONS,
  FACT_TONES,
  HIDEABLE_SECTION_KEYS,
  MEDAL_KINDS,
  MILESTONE_CATEGORIES,
  MilestoneSchema,
  AchievementSchema,
  PioneerSchema,
} from './about-sections.schema.js';

/**
 * The closed vocabularies the rest of the feature is written against, and the
 * defaults a newly added list item starts on. `validate()` runs the schema's
 * own validators; nothing is written.
 */

const text = (value: string) => ({ ar: value, en: value });

describe('About page vocabularies', () => {
  it('names the ten sections the approved page prints, in printed order', () => {
    expect(ABOUT_SECTION_KEYS).toEqual([
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
    ]);
  });

  /** ADR-0101: the hero always prints, and the two automatic sections answer
   *  to their source rather than to an editor's switch. */
  it('lets an editor hide the seven content sections and no others', () => {
    expect(HIDEABLE_SECTION_KEYS).toEqual([
      'facts',
      'story',
      'timeline',
      'achievements',
      'pioneers',
      'governance',
      'cta',
    ]);
    expect(HIDEABLE_SECTION_KEYS).not.toContain('hero');
    expect(HIDEABLE_SECTION_KEYS).not.toContain('leadership');
    expect(HIDEABLE_SECTION_KEYS).not.toContain('ecosystem');
  });

  it('offers the four date precisions the milestone editor draws', () => {
    expect(DATE_PRECISIONS).toEqual(['year', 'monthYear', 'fullDate', 'unknown']);
  });

  it('offers the five milestone categories the approved select lists', () => {
    expect(MILESTONE_CATEGORIES).toEqual([
      'association',
      'firstLeadership',
      'firstParticipation',
      'federation',
      'globalMembership',
      'continentalMembership',
    ]);
  });

  it('offers the four medal kinds and the four fact tones', () => {
    expect(MEDAL_KINDS).toEqual(['gold', 'silver', 'bronze', 'other']);
    expect(FACT_TONES).toEqual(['green', 'black', 'red', 'tri']);
  });
});

describe('Milestone subschema', () => {
  const Holder = mongoose.model(
    'MilestoneHolder',
    new mongoose.Schema({ items: { type: [MilestoneSchema], default: [] } }),
  );

  const milestone = (extra: Record<string, unknown> = {}) => ({
    datePrecision: 'year',
    year: 1974,
    category: 'association',
    title: text('t'),
    description: text('d'),
    displayOrder: 0,
    ...extra,
  });

  it('starts a new milestone visible and unfeatured', () => {
    const doc = new Holder({ items: [milestone()] });
    expect(doc.items[0].isVisible).toBe(true);
    expect(doc.items[0].featured).toBe(false);
  });

  it('gives every milestone its own id, so a reorder never changes which is which', () => {
    const doc = new Holder({ items: [milestone(), milestone()] });
    expect(doc.items[0]._id.toString()).not.toEqual(doc.items[1]._id.toString());
  });

  it('accepts a milestone whose date is not known, holding its date parts empty', () => {
    const doc = new Holder({ items: [{ ...milestone(), datePrecision: 'unknown', year: undefined }] });
    expect(doc.items[0].year).toBeNull();
    expect(doc.items[0].month).toBeNull();
    expect(doc.items[0].day).toBeNull();
  });

  it('refuses a date precision outside the four', async () => {
    const error = await new Holder({ items: [milestone({ datePrecision: 'decade' })] })
      .validate()
      .then(() => null, (failure: unknown) => failure as mongoose.Error.ValidationError);
    expect(error?.errors['items.0.datePrecision']).toBeDefined();
  });
});

describe('Achievement subschema', () => {
  const Holder = mongoose.model(
    'AchievementHolder',
    new mongoose.Schema({ items: { type: [AchievementSchema], default: [] } }),
  );

  const achievement = (extra: Record<string, unknown> = {}) => ({
    year: 2014,
    place: text('Incheon'),
    medalKind: 'gold',
    title: text('t'),
    description: text('d'),
    displayOrder: 0,
    ...extra,
  });

  it('leaves the free medal label and the athlete link empty by default', () => {
    const doc = new Holder({ items: [achievement()] });
    expect(doc.items[0].medalLabel).toBeNull();
    expect(doc.items[0].athleteId).toBeNull();
  });

  it('carries a free medal label beside the kind, for a haul the four kinds cannot name', () => {
    const doc = new Holder({ items: [achievement({ medalLabel: text('5 golds') })] });
    expect(doc.items[0].medalLabel?.en).toBe('5 golds');
  });
});

describe('Pioneer subschema', () => {
  const Holder = mongoose.model(
    'PioneerHolder',
    new mongoose.Schema({ items: { type: [PioneerSchema], default: [] } }),
  );

  it('starts a new pioneer visible and not the featured one', () => {
    const doc = new Holder({
      items: [{ name: text('n'), badge: text('b'), description: text('d'), displayOrder: 0 }],
    });
    expect(doc.items[0].isVisible).toBe(true);
    expect(doc.items[0].featured).toBe(false);
  });
});
