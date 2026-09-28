import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_ACTIONS, SECURITY_AUDIT_ACTIONS } from './audit-log.schema.js';

/**
 * Vocabulary-level invariants for `AUDIT_ACTIONS` — same mechanical style as
 * `capability-map.spec.ts`: derive the truth from the source, so a value that
 * drifts is a failing test rather than a gap found in the log months later.
 */
describe('AUDIT_ACTIONS', () => {
  it('names every security action inside the vocabulary it is a subset of', () => {
    const unknown = SECURITY_AUDIT_ACTIONS.filter(
      (action) => !(AUDIT_ACTIONS as readonly string[]).includes(action),
    );
    expect(unknown).toEqual([]);
  });

  /**
   * Owner decision 2026-09-27. `HardDelete` stays IN the vocabulary — a
   * stored row might still reference it, and dropping a value a row could
   * hold from a closed enum is a migration decision, not a cleanup — but
   * nothing may write it going forward. `PermanentDelete` is what the same
   * act writes now.
   *
   * Scans real source, excluding this file's own declaration, for the exact
   * quoted literal — not the bare English word, which also names the
   * unrelated `allowHardDelete` policy flag and appears in ordinary prose
   * about that gate throughout `documents`/`contact-messages`/
   * `workflow-policies`. Those are real, current, unrelated concepts; this
   * test is about the AUDIT ACTION value only.
   */
  it('is written nowhere in the source — HardDelete is deprecated and dead', () => {
    const sourceRoot = join(process.cwd(), 'src');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory()
          ? walk(full)
          : full.endsWith('.ts') && !full.endsWith('.spec.ts')
            ? [full]
            : [];
      });

    const offenders = walk(sourceRoot)
      .filter((file) => !file.replace(/\\/g, '/').endsWith('audit-log.schema.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes("'HardDelete'"))
      .map((file) => file.replace(/\\/g, '/'));

    // The one measured exception: a doc comment in `revisions.service.ts`
    // about a past PERMISSION action name, not the audit action — prose,
    // not a write. Named explicitly rather than excluded silently, so a
    // second real occurrence still fails this test.
    expect(offenders).toEqual([expect.stringContaining('revisions.service.ts')]);
  });
});
