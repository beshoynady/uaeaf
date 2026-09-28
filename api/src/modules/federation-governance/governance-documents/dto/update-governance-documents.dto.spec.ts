import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateGovernanceDocumentDto } from './update-governance-documents.dto.js';

/**
 * Checked through the same pipeline the global `ValidationPipe` runs
 * (`whitelist: true, forbidNonWhitelisted: true`), so a field the DTO does
 * not declare is refused here exactly as it would be on the wire.
 *
 * Fix round 1 (CLAUDE.md §31): `fileId` is the guard this test proves —
 * re-pointing a governance document at a different underlying file would
 * bypass `create()`'s existence check on the referenced `documents` row, so
 * the field is made unreachable rather than merely documented as risky.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(UpdateGovernanceDocumentDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('UpdateGovernanceDocumentDto — relinking is not an editor field', () => {
  it('refuses a body carrying fileId', async () => {
    const errors = await errorsOf({ fileId: '000000000000000000000001' });

    expect(errors.map((error) => error.property)).toContain('fileId');
  });

  it('takes an ordinary field with no other errors', async () => {
    expect(await errorsOf({ documentVersion: 'v2' })).toHaveLength(0);
  });
});
