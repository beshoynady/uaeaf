import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Owner decision 2026-09-27, round 3: `auditActionFor` (`audit-action.util.ts`)
 * is the one function that decides a CRUD-shaped audit action from a
 * permission verb. No file outside it may hand-type one of the values it
 * derives — that is exactly the drift that let `ArticlesService.remove`
 * write the stale literal `'Delete'` for a route already guarded by
 * `articles:Archive`, unnoticed, because nothing scanned for it.
 *
 * NOT every audit action. `StatusChange` (`PublishingService`,
 * `WorkflowInstancesService`, `ApprovalConfigurationService`), `AccessDenied`
 * (`PermissionsGuard`) and `SuperAdminGranted`/`SuperAdminRevoked`
 * (`UsersService`) are not permission-verb derivations at all — none of them
 * corresponds to a `PermissionAction`, so `auditActionFor` has nothing to
 * derive them FROM (see its own doc comment). They stay hand-typed,
 * deliberately, and are named here as excused values rather than silently
 * let through by a scan too narrow to see them.
 */
describe('no literal audit action outside auditActionFor', () => {
  const sourceRoot = join(process.cwd(), 'src');

  // Real audit actions that are NOT permission-verb derivations — see the
  // module doc comment above for why each one is legitimately hand-typed.
  // This is the ONLY filter: ANY literal `action:` string found inside a
  // `.write(` call is a violation unless it is named here, with a reason.
  //
  // FIXED 2026-09-27 (independent review, round 4, M1): the previous version
  // filtered candidates to a separate `DERIVABLE_VALUES` list FIRST and only
  // then subtracted this set — but `DERIVABLE_VALUES` and `EXCUSED_VALUES`
  // were disjoint by construction (nothing here is also a permission-verb
  // derivation), so the subtraction could never remove anything the first
  // filter had not already removed. The set was reachable code with no
  // reachable effect: deleting it left every test passing. Matching ANY
  // literal here, not just a pre-approved shortlist, is also the safer
  // default — a brand new hand-typed value with no entry here now fails
  // loudly instead of silently passing because nobody had taught the scan
  // its name yet.
  const EXCUSED_VALUES = new Set(['StatusChange', 'AccessDenied', 'SuperAdminGranted', 'SuperAdminRevoked']);

  // Declares the vocabulary/derivation itself; writes no row, so a match
  // inside either would be the scan seeing its own definition.
  const EXCLUDED_FILES: readonly { suffix: string; reason: string }[] = [
    { suffix: 'audit-action.util.ts', reason: 'defines auditActionFor and the maps it derives from' },
    { suffix: 'audit-log.schema.ts', reason: 'declares AUDIT_ACTIONS / SECURITY_AUDIT_ACTIONS themselves' },
  ];

  /** Blanks comments while preserving offsets — the same technique
   *  `audit-route-coverage.spec.ts` uses, and for the same reason: an
   *  earlier scanner in this repo produced false positives by matching text
   *  that only appeared inside a doc comment. */
  const stripComments = (src: string): string =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

  /** The text of a call's argument list, balanced across nested parens (a
   *  `new Types.ObjectId(id)` inside the call's own object literal, say) —
   *  starting right after the call's own opening `(`, whose depth-1 is
   *  already assumed consumed. */
  const balancedCall = (source: string, openParenIndex: number): string => {
    let depth = 1;
    let i = openParenIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
      i++;
    }
    return source.slice(openParenIndex, i);
  };

  /**
   * Every hand-typed, derivable action literal inside an
   * `auditLogsService.write(...)` call in this source text — a plain
   * function over a string, not file I/O, so it can be proven against a
   * planted example without touching a real file (see the tests below).
   */
  const literalActionsWritten = (source: string): string[] => {
    const stripped = stripComments(source);
    const found: string[] = [];
    const callSite = /auditLogsService\.write\(/g;
    let match: RegExpExecArray | null;
    while ((match = callSite.exec(stripped))) {
      const span = balancedCall(stripped, match.index + match[0].length);
      const literal = span.match(/action:\s*['"]([A-Za-z]+)['"]/);
      if (literal && !EXCUSED_VALUES.has(literal[1])) {
        found.push(literal[1]);
      }
    }
    return found;
  };

  // Proves the guard bites — a scan that passes on a real violation is worse
  // than no scan, because it looks like coverage that is not there.
  it('bites: finds a planted literal', () => {
    const planted = `
      class X {
        async remove() {
          await this.auditLogsService.write({
            actorId: new Types.ObjectId(this.id),
            action: 'Archive',
            entityType: 'x',
          });
        }
      }
    `;

    expect(literalActionsWritten(planted)).toEqual(['Archive']);
  });

  it('does not flag an excused, non-derivable action', () => {
    const source = `
      await this.auditLogsService.write({ actorId, action: 'StatusChange', entityType });
    `;

    expect(literalActionsWritten(source)).toEqual([]);
  });

  // Proves `EXCUSED_VALUES` is load-bearing rather than redundant (M1): a
  // literal that is neither a known CRUD action nor an excused one is still
  // flagged — the scan is not secretly gated by a separate shortlist of
  // "values worth checking".
  it('flags an unrecognised literal that is not excused, not only the known CRUD ones', () => {
    const source = `
      await this.auditLogsService.write({ actorId, action: 'SomeFutureAction', entityType });
    `;

    expect(literalActionsWritten(source)).toEqual(['SomeFutureAction']);
  });

  it('does not flag a computed or passed-through action', () => {
    const source = `
      const action = auditActionFor(method, permissionAction);
      await this.auditLogsService.write({ actorId, action, entityType });
    `;

    expect(literalActionsWritten(source)).toEqual([]);
  });

  it('does not flag a comment that merely mentions a literal action', () => {
    const source = `
      // action: 'Archive' — historical note, not a real call
      await this.auditLogsService.write({ actorId, action: input.action, entityType });
    `;

    expect(literalActionsWritten(source)).toEqual([]);
  });

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory()
        ? walk(full)
        : full.endsWith('.ts') && !full.endsWith('.spec.ts')
          ? [full]
          : [];
    });

  it('walks a realistic number of files, so an empty tree cannot pass as green', () => {
    expect(walk(sourceRoot).length).toBeGreaterThan(500);
  });

  it('finds no hand-typed, unexcused action literal in real source', () => {
    const offenders: string[] = [];

    for (const file of walk(sourceRoot)) {
      const normalised = file.replace(/\\/g, '/');
      if (EXCLUDED_FILES.some(({ suffix }) => normalised.endsWith(suffix))) {
        continue;
      }
      const violations = literalActionsWritten(readFileSync(file, 'utf8'));
      if (violations.length > 0) {
        offenders.push(`${normalised}: ${violations.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
