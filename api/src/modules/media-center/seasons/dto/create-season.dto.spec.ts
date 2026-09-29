import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSeasonDto } from './create-season.dto.js';
import { UpdateSeasonDto } from './update-season.dto.js';

/** Checked through the same pipeline the global `ValidationPipe` runs
 *  (`whitelist: true, forbidNonWhitelisted: true`). */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(CreateSeasonDto, body), { whitelist: true, forbidNonWhitelisted: true });

const validBody = () => ({
  name: { en: 'Season 2026-2027', ar: 'موسم 2026-2027' },
  shortName: '26/27',
  slug: '2026-2027',
  about: { en: 'About', ar: 'نبذة' },
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2027-08-31T23:59:59.999Z',
  publicationState: 'Draft',
});

describe('CreateSeasonDto', () => {
  it('takes a minimal valid body with no errors', async () => {
    expect(await errorsOf(validBody())).toHaveLength(0);
  });

  it('refuses a body whose nested about.en is empty', async () => {
    const errors = await errorsOf({ ...validBody(), about: { en: '', ar: 'نبذة' } });

    const aboutErrors = errors.find((error) => error.property === 'about');
    expect(aboutErrors?.children?.some((child) => child.property === 'en')).toBe(true);
  });

  it('refuses `publicationState: Published` — reachable only through PATCH /seasons/:id/publish', async () => {
    const errors = await errorsOf({ ...validBody(), publicationState: 'Published' });

    expect(errors.map((error) => error.property)).toContain('publicationState');
  });

  it('refuses a body carrying isCurrent — settable only through PATCH /seasons/:id/set-current', async () => {
    const errors = await errorsOf({ ...validBody(), isCurrent: true });

    expect(errors.map((error) => error.property)).toContain('isCurrent');
  });

  it('accepts a valid phases entry', async () => {
    const errors = await errorsOf({
      ...validBody(),
      phases: [{ name: { en: 'Preparation', ar: 'إعداد' }, type: 'preparation', from: validBody().startDate, to: validBody().endDate }],
    });

    expect(errors).toHaveLength(0);
  });

  it('refuses a phases entry with an unknown type', async () => {
    const errors = await errorsOf({
      ...validBody(),
      phases: [{ name: { en: 'Preparation', ar: 'إعداد' }, type: 'not-a-real-phase', from: validBody().startDate, to: validBody().endDate }],
    });

    const phaseErrors = errors.find((error) => error.property === 'phases');
    expect(phaseErrors?.children?.[0]?.children?.some((child) => child.property === 'type')).toBe(true);
  });

  it('refuses a phases entry missing a required date', async () => {
    const errors = await errorsOf({
      ...validBody(),
      phases: [{ name: { en: 'Preparation', ar: 'إعداد' }, type: 'preparation', from: validBody().startDate }],
    });

    const phaseErrors = errors.find((error) => error.property === 'phases');
    expect(phaseErrors?.children?.[0]?.children?.some((child) => child.property === 'to')).toBe(true);
  });

  it('accepts a valid keyDates entry', async () => {
    const errors = await errorsOf({
      ...validBody(),
      keyDates: [{ title: { en: 'Registration opens', ar: 'فتح التسجيل' }, date: validBody().startDate }],
    });

    expect(errors).toHaveLength(0);
  });

  it('refuses a keyDates entry with a malformed date', async () => {
    const errors = await errorsOf({
      ...validBody(),
      keyDates: [{ title: { en: 'Registration opens', ar: 'فتح التسجيل' }, date: 'not-a-date' }],
    });

    const keyDateErrors = errors.find((error) => error.property === 'keyDates');
    expect(keyDateErrors?.children?.[0]?.children?.some((child) => child.property === 'date')).toBe(true);
  });
});

describe('UpdateSeasonDto', () => {
  const errorsOfUpdate = async (body: Record<string, unknown>) =>
    validate(plainToInstance(UpdateSeasonDto, body), { whitelist: true, forbidNonWhitelisted: true });

  it('refuses a body carrying slug — renaming a live address is not offered here', async () => {
    const errors = await errorsOfUpdate({ slug: 'renamed' });

    expect(errors.map((error) => error.property)).toContain('slug');
  });

  it('takes an empty patch with no errors', async () => {
    expect(await errorsOfUpdate({})).toHaveLength(0);
  });

  it('accepts null on tagline to clear it', async () => {
    expect(await errorsOfUpdate({ tagline: null })).toHaveLength(0);
  });

  it('accepts null on logoId to clear it', async () => {
    expect(await errorsOfUpdate({ logoId: null })).toHaveLength(0);
  });
});
