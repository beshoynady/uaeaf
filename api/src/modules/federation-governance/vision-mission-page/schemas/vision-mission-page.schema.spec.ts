import mongoose from 'mongoose';
import { VisionMissionPage, VisionMissionPageSchema } from './vision-mission-page.schema.js';

/**
 * The stored row refuses a strategic goal without one of the twelve icon
 * keys, as it refuses such a core value (owner decision 2026-09-15).
 * `validate()` runs the schema's own validators; nothing is written.
 */

const Page = mongoose.model(VisionMissionPage.name, VisionMissionPageSchema);

const text = (value: string) => ({ ar: value, en: value });

/** The error on the goal's `iconKey` alone: the row has required fields this
 *  spec does not fill. */
const iconKeyError = async (extra: Record<string, unknown>) => {
  const page = new Page({
    strategicGoals: [{ title: text('t'), description: text('d'), displayOrder: 1, ...extra }],
  });
  const failure = await page.validate().then(
    () => null,
    (error: unknown) => error as mongoose.Error.ValidationError,
  );
  return failure?.errors['strategicGoals.0.iconKey'];
};

describe('VisionMissionPage schema — strategic goals', () => {
  it('keeps a goal that names one of the twelve icon keys', async () => {
    expect(await iconKeyError({ iconKey: 'star' })).toBeUndefined();
  });

  it('refuses a goal with no icon key', async () => {
    expect(await iconKeyError({})).toBeDefined();
  });

  it('refuses an icon key outside the twelve', async () => {
    expect(await iconKeyError({ iconKey: 'rocket' })).toBeDefined();
  });
});
