import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAthleteProfileDto } from './update-athlete-profile.dto.js';

/**
 * Checked through the same pipeline the global `ValidationPipe` runs
 * (`whitelist: true, forbidNonWhitelisted: true`), so a field the DTO does
 * not declare is refused here exactly as it would be on the wire.
 *
 * Fix round 1 (CLAUDE.md §31): `athleteId` is the guard this test proves —
 * re-parenting a profile to a different athlete would bypass `create()`'s
 * Local-residency/one-profile-per-athlete checks, so the field is made
 * unreachable rather than merely documented as risky.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(UpdateAthleteProfileDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('UpdateAthleteProfileDto — relinking is not an editor field', () => {
  it('refuses a body carrying athleteId', async () => {
    const errors = await errorsOf({ athleteId: '000000000000000000000001' });

    expect(errors.map((error) => error.property)).toContain('athleteId');
  });

  it('takes an ordinary field with no other errors', async () => {
    expect(await errorsOf({ status: 'Inactive' })).toHaveLength(0);
  });
});
