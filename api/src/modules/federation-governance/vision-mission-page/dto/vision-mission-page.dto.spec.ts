import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVisionMissionPageDto } from './create-vision-mission-page.dto.js';
import { UpdateVisionMissionPageDto } from './update-vision-mission-page.dto.js';

/**
 * A strategic goal names one of the twelve icon keys, as a core value does
 * (owner decision 2026-09-15). Checked through the real `class-validator`
 * pipeline the global `ValidationPipe` runs, so a decorator dropped from
 * either body fails here rather than only in a live 400 response.
 */

const text = (value: string) => ({ ar: value, en: value });

const goal = (extra: Record<string, unknown>) => ({
  title: text('t'),
  description: text('d'),
  displayOrder: 1,
  ...extra,
});

/** Only the errors under `strategicGoals`: the create body has required
 *  fields this spec does not fill. */
const goalErrors = async (body: ClassConstructor<object>, strategicGoals: unknown[]) => {
  const errors = await validate(plainToInstance(body, { strategicGoals }));
  return errors.filter((error) => error.property === 'strategicGoals');
};

const BODIES: Array<[string, ClassConstructor<object>]> = [
  ['CreateVisionMissionPageDto', CreateVisionMissionPageDto],
  ['UpdateVisionMissionPageDto', UpdateVisionMissionPageDto],
];

describe.each(BODIES)('%s — strategic goals', (_name, body) => {
  it('accepts a goal that names one of the twelve icon keys', async () => {
    expect(await goalErrors(body, [goal({ iconKey: 'star' })])).toHaveLength(0);
  });

  it('refuses a goal with no icon key', async () => {
    expect(await goalErrors(body, [goal({})])).not.toHaveLength(0);
  });

  it('refuses an icon key outside the twelve', async () => {
    expect(await goalErrors(body, [goal({ iconKey: 'rocket' })])).not.toHaveLength(0);
  });
});
