import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateFederationPersonnelDto } from './update-federation-personnel.dto.js';

/**
 * `cv`/`showPublicContact` are redeclared on `UpdateFederationPersonnelDto`
 * to refuse `null` — `@IsOptional()`, inherited from
 * `CreateFederationPersonnelDto`, would otherwise AND with `PartialType`'s
 * own `ValidateIf` and still skip every validator on `null`. Checked through
 * the same pipeline the global `ValidationPipe` runs.
 */
const errorsOf = async (body: Record<string, unknown>) => validate(plainToInstance(UpdateFederationPersonnelDto, body));

describe('UpdateFederationPersonnelDto — cv/showPublicContact refuse null', () => {
  it('refuses { cv: null }', async () => {
    const errors = await errorsOf({ cv: null });

    expect(errors.map((error) => error.property)).toContain('cv');
  });

  it('refuses { showPublicContact: null }', async () => {
    const errors = await errorsOf({ showPublicContact: null });

    expect(errors.map((error) => error.property)).toContain('showPublicContact');
  });

  it('still accepts each field being omitted', async () => {
    expect(await errorsOf({ status: 'Inactive' })).toHaveLength(0);
  });

  it('still accepts a real value for each', async () => {
    expect(await errorsOf({ showPublicContact: true })).toHaveLength(0);
    expect(
      await errorsOf({ cv: { qualifications: [{ text: { en: 'a', ar: 'ا' }, order: 1 }] } }),
    ).toHaveLength(0);
  });
});
