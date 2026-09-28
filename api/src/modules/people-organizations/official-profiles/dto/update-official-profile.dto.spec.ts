import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOfficialProfileDto } from './update-official-profile.dto.js';

/**
 * Checked through the same pipeline the global `ValidationPipe` runs
 * (`whitelist: true, forbidNonWhitelisted: true`), so a field the DTO does
 * not declare is refused here exactly as it would be on the wire.
 *
 * Fix round 1 (CLAUDE.md §31): `officialId` is the guard this test proves —
 * re-parenting a profile to a different official would bypass `create()`'s
 * Local-residency/one-profile-per-official checks, so the field is made
 * unreachable rather than merely documented as risky.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(UpdateOfficialProfileDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('UpdateOfficialProfileDto — relinking is not an editor field', () => {
  it('refuses a body carrying officialId', async () => {
    const errors = await errorsOf({ officialId: '000000000000000000000001' });

    expect(errors.map((error) => error.property)).toContain('officialId');
  });

  it('takes an ordinary field with no other errors', async () => {
    expect(await errorsOf({ status: 'Inactive' })).toHaveLength(0);
  });
});
