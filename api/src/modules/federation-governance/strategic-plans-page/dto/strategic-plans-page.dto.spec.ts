import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CreateStrategicPlansPageDto } from './create-strategic-plans-page.dto.js';
import { UpdateStrategicPlansPageDto } from './update-strategic-plans-page.dto.js';
import { ReorderPlanListDto } from './reorder-plan-list.dto.js';

/**
 * Checked through the real `class-validator` pipeline the global
 * `ValidationPipe` runs (whitelist, forbid unknown), so a decorator dropped
 * from either body fails here rather than only in a live 400 response.
 */

const text = (value: string) => ({ ar: value, en: value });

const item = (extra: Record<string, unknown> = {}) => ({
  title: text('t'),
  description: text('d'),
  displayOrder: 1,
  ...extra,
});

const PIPE = { whitelist: true, forbidNonWhitelisted: true } as const;

/** Only the errors under one property: the create body has required fields
 *  these specs do not fill. */
const errorsUnder = async (body: ClassConstructor<object>, property: string, value: unknown) => {
  const errors = await validate(plainToInstance(body, { [property]: value }), PIPE);
  return errors.filter((error) => error.property === property);
};

const BODIES: Array<[string, ClassConstructor<object>]> = [
  ['CreateStrategicPlansPageDto', CreateStrategicPlansPageDto],
  ['UpdateStrategicPlansPageDto', UpdateStrategicPlansPageDto],
];

describe.each(BODIES)('%s — phases', (_name, body) => {
  it('accepts a phase that names one of the four icon keys', async () => {
    expect(await errorsUnder(body, 'phases', [item({ iconKey: 'layers' })])).toHaveLength(0);
  });

  it('refuses a phase with no icon key', async () => {
    expect(await errorsUnder(body, 'phases', [item()])).not.toHaveLength(0);
  });

  it('refuses an icon key outside the four', async () => {
    expect(await errorsUnder(body, 'phases', [item({ iconKey: 'star' })])).not.toHaveLength(0);
  });
});

describe.each(BODIES)('%s — list items', (_name, body) => {
  it('accepts an item that carries its id, and one that does not', async () => {
    const withId = item({ _id: String(new Types.ObjectId()) });
    expect(await errorsUnder(body, 'pillars', [withId, item()])).toHaveLength(0);
  });

  it('refuses an id that is not an ObjectId', async () => {
    expect(await errorsUnder(body, 'pillars', [item({ _id: 'first' })])).not.toHaveLength(0);
  });

  it('accepts a visibility flag and refuses a non-boolean one', async () => {
    expect(await errorsUnder(body, 'objectives', [item({ isVisible: false })])).toHaveLength(0);
    expect(await errorsUnder(body, 'objectives', [item({ isVisible: 'no' })])).not.toHaveLength(0);
  });

  it('requires a metric value and label', async () => {
    expect(await errorsUnder(body, 'metrics', [{ value: '+30%', label: text('l'), displayOrder: 1 }])).toHaveLength(0);
    expect(await errorsUnder(body, 'metrics', [{ value: '', label: text('l'), displayOrder: 1 }])).not.toHaveLength(0);
    expect(await errorsUnder(body, 'metrics', [{ value: '15', displayOrder: 1 }])).not.toHaveLength(0);
  });

  it('lets a step carry no description, or null', async () => {
    expect(await errorsUnder(body, 'executionSteps', [{ title: text('s'), displayOrder: 1 }])).toHaveLength(0);
    expect(
      await errorsUnder(body, 'executionSteps', [{ title: text('s'), description: null, displayOrder: 1 }]),
    ).toHaveLength(0);
    expect(await errorsUnder(body, 'executionSteps', [{ displayOrder: 1 }])).not.toHaveLength(0);
  });

  it('refuses a field no item declares', async () => {
    expect(await errorsUnder(body, 'pillars', [item({ colour: 'red' })])).not.toHaveLength(0);
  });
});

describe('UpdateStrategicPlansPageDto', () => {
  it('accepts an empty body: every field is optional', async () => {
    expect(await validate(plainToInstance(UpdateStrategicPlansPageDto, {}), PIPE)).toHaveLength(0);
  });

  it('clears a nullable text or image with null', async () => {
    const body = { pillarsText: null, executionText: null, ctaText: null, introImageId: null, seo: null };
    expect(await validate(plainToInstance(UpdateStrategicPlansPageDto, body), PIPE)).toHaveLength(0);
  });

  it.each(['federationId', 'publicationState', 'revisionId'])('refuses %s: not an editor\'s to change', async (key) => {
    const errors = await validate(plainToInstance(UpdateStrategicPlansPageDto, { [key]: 'x' }), PIPE);
    expect(errors.map((error) => error.property)).toContain(key);
  });
});

describe('ReorderPlanListDto', () => {
  it('accepts a non-empty list of ObjectIds', async () => {
    const body = { ids: [String(new Types.ObjectId()), String(new Types.ObjectId())] };
    expect(await validate(plainToInstance(ReorderPlanListDto, body), PIPE)).toHaveLength(0);
  });

  it('refuses an empty list and a non-id entry', async () => {
    expect(await validate(plainToInstance(ReorderPlanListDto, { ids: [] }), PIPE)).not.toHaveLength(0);
    expect(await validate(plainToInstance(ReorderPlanListDto, { ids: ['first'] }), PIPE)).not.toHaveLength(0);
  });
});
