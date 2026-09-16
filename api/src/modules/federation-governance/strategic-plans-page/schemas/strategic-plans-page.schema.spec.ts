import mongoose, { Types } from 'mongoose';
import { StrategicPlansPage, StrategicPlansPageSchema } from './strategic-plans-page.schema.js';

/**
 * The stored row carries the eight sections of the approved page and nothing
 * of the old documents/period design; every list item is a subdocument with
 * its own id, so a reorder never changes which item is which. `validate()`
 * runs the schema's own validators; nothing is written.
 */

const Page = mongoose.model(StrategicPlansPage.name, StrategicPlansPageSchema);

const text = (value: string) => ({ ar: value, en: value });

const item = (extra: Record<string, unknown> = {}) => ({
  title: text('t'),
  description: text('d'),
  displayOrder: 1,
  ...extra,
});

const failureOf = async (doc: Record<string, unknown>) =>
  new Page(doc).validate().then(
    () => null,
    (error: unknown) => error as mongoose.Error.ValidationError,
  );

describe('StrategicPlansPage schema — fields', () => {
  it('declares every section field the page prints, and none of the old design', () => {
    const paths = Object.keys(StrategicPlansPageSchema.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        'heroImageId',
        'heroTitle',
        'heroSubtitle',
        'federationId',
        'introHeading',
        'introText',
        'introImageId',
        'phasesTitle',
        'phases',
        'pillarsTitle',
        'pillarsText',
        'pillars',
        'objectivesTitle',
        'objectivesImageId',
        'objectives',
        'metricsTitle',
        'metricsImageId',
        'metrics',
        'executionTitle',
        'executionText',
        'executionSteps',
        'ctaTitle',
        'ctaText',
        'ctaImageId',
        'seo',
        'revisionId',
        'publicationState',
      ]),
    );
    for (const old of [
      'periodStart',
      'periodEnd',
      'foundationPillars',
      'strategicAxes',
      'impactMetrics',
      'documentId',
      'documentVersion',
    ]) {
      expect(paths).not.toContain(old);
    }
  });

  it('stays on the strategicPlansPage collection', () => {
    expect(StrategicPlansPageSchema.get('collection')).toBe('strategicPlansPage');
  });

  it('requires the section titles the composition always prints', async () => {
    const failure = await failureOf({});

    for (const field of [
      'introHeading',
      'introText',
      'pillarsTitle',
      'objectivesTitle',
      'metricsTitle',
      'executionTitle',
      'ctaTitle',
      'publicationState',
      'federationId',
    ]) {
      expect(failure?.errors[field]).toBeDefined();
    }
  });

  it('defaults the optional texts and images to null and the lists to empty', () => {
    const page = new Page({});

    expect(page.phasesTitle).toBeNull();
    expect(page.pillarsText).toBeNull();
    expect(page.executionText).toBeNull();
    expect(page.ctaText).toBeNull();
    expect(page.introImageId).toBeNull();
    expect(page.objectivesImageId).toBeNull();
    expect(page.metricsImageId).toBeNull();
    expect(page.ctaImageId).toBeNull();
    expect(page.seo).toBeNull();
    expect(page.phases).toEqual([]);
    expect(page.pillars).toEqual([]);
    expect(page.objectives).toEqual([]);
    expect(page.metrics).toEqual([]);
    expect(page.executionSteps).toEqual([]);
  });
});

describe('StrategicPlansPage schema — list items', () => {
  it('gives every list item its own id, so a reorder keeps the item', () => {
    const page = new Page({
      phases: [item({ iconKey: 'layers' })],
      pillars: [item()],
      objectives: [item()],
      metrics: [{ value: '2030', label: text('l'), displayOrder: 1 }],
      executionSteps: [{ title: text('s'), displayOrder: 1 }],
    });

    expect(page.phases[0]._id).toBeInstanceOf(Types.ObjectId);
    expect(page.pillars[0]._id).toBeInstanceOf(Types.ObjectId);
    expect(page.objectives[0]._id).toBeInstanceOf(Types.ObjectId);
    expect(page.metrics[0]._id).toBeInstanceOf(Types.ObjectId);
    expect(page.executionSteps[0]._id).toBeInstanceOf(Types.ObjectId);
  });

  it('keeps an id the item already carries', () => {
    const id = new Types.ObjectId();
    const page = new Page({ pillars: [item({ _id: id })] });

    expect(String(page.pillars[0]._id)).toBe(String(id));
  });

  it('shows every item unless told otherwise', () => {
    const page = new Page({
      pillars: [item(), item({ isVisible: false })],
      metrics: [{ value: '15', label: text('l'), displayOrder: 1 }],
      executionSteps: [{ title: text('s'), displayOrder: 1 }],
    });

    expect(page.pillars[0].isVisible).toBe(true);
    expect(page.pillars[1].isVisible).toBe(false);
    expect(page.metrics[0].isVisible).toBe(true);
    expect(page.executionSteps[0].isVisible).toBe(true);
  });

  it('keeps a phase that names one of the four icon keys', async () => {
    const failure = await failureOf({ phases: [item({ iconKey: 'trending-up' })] });

    expect(failure?.errors['phases.0.iconKey']).toBeUndefined();
  });

  it('refuses a phase with no icon key', async () => {
    const failure = await failureOf({ phases: [item()] });

    expect(failure?.errors['phases.0.iconKey']).toBeDefined();
  });

  it('refuses a phase icon key outside the four', async () => {
    const failure = await failureOf({ phases: [item({ iconKey: 'star' })] });

    expect(failure?.errors['phases.0.iconKey']).toBeDefined();
  });

  it('requires a metric value and label, and a step title', async () => {
    const failure = await failureOf({
      metrics: [{ displayOrder: 1 }],
      executionSteps: [{ displayOrder: 1 }],
    });

    expect(failure?.errors['metrics.0.value']).toBeDefined();
    expect(failure?.errors['metrics.0.label']).toBeDefined();
    expect(failure?.errors['executionSteps.0.title']).toBeDefined();
  });

  it('lets a step carry no description', async () => {
    const page = new Page({ executionSteps: [{ title: text('s'), displayOrder: 1 }] });
    const failure = await page.validate().then(
      () => null,
      (error: unknown) => error as mongoose.Error.ValidationError,
    );

    expect(page.executionSteps[0].description).toBeNull();
    expect(failure?.errors['executionSteps.0.description']).toBeUndefined();
  });
});
