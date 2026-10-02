import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCommitteeDto } from './update-committees.dto.js';

/**
 * `duties`/`documentIds`/`isVisible` are redeclared on `UpdateCommitteeDto`
 * to refuse `null` — the opposite of `summary`/`about`/etc., which redeclare
 * to accept it. Checked through the same pipeline the global
 * `ValidationPipe` runs.
 */
const errorsOf = async (body: Record<string, unknown>) => validate(plainToInstance(UpdateCommitteeDto, body));

describe('UpdateCommitteeDto — duties/documentIds/isVisible refuse null', () => {
  it('refuses { isVisible: null }', async () => {
    const errors = await errorsOf({ isVisible: null });

    expect(errors.map((error) => error.property)).toContain('isVisible');
  });

  it('refuses { duties: null }', async () => {
    const errors = await errorsOf({ duties: null });

    expect(errors.map((error) => error.property)).toContain('duties');
  });

  it('refuses { documentIds: null }', async () => {
    const errors = await errorsOf({ documentIds: null });

    expect(errors.map((error) => error.property)).toContain('documentIds');
  });

  it('still accepts each field being omitted', async () => {
    expect(await errorsOf({ displayOrder: 2 })).toHaveLength(0);
  });

  it('still accepts a real value for each', async () => {
    expect(await errorsOf({ isVisible: false })).toHaveLength(0);
    expect(await errorsOf({ documentIds: [] })).toHaveLength(0);
    expect(
      await errorsOf({ duties: [{ title: { en: 'a', ar: 'ا' }, desc: { en: 'b', ar: 'ب' }, order: 1 }] }),
    ).toHaveLength(0);
  });
});
