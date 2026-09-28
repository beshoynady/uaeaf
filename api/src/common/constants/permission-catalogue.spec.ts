import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PERMISSION_CATALOGUE } from './permission-catalogue.js';

/** Same invariant as `permission-resources.spec.ts`, one level finer: not
 *  just which resources exist, but which actions are actually guarded on
 *  each. A catalogue that drifts from the decorators seeds permissions that
 *  gate nothing, or leaves a guarded route with no permission any role can
 *  ever hold — an endpoint nobody can call. */
describe('PERMISSION_CATALOGUE', () => {
  const sourceRoot = join(process.cwd(), 'src');

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });

  const usedPairs = (): Set<string> => {
    const found = new Set<string>();
    for (const file of walk(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/@RequirePermission\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
        found.add(`${match[1]}:${match[2]}`);
      }
    }
    return found;
  };

  const declaredPairs = new Set(
    PERMISSION_CATALOGUE.map((entry) => `${entry.resourceType}:${entry.action}`),
  );

  /**
   * Pairs enforced in service code rather than by a route decorator.
   *
   * `PublishingService` resolves `<entityType>:Publish` for every
   * `PUBLICATION_ENTITY_TYPE` when it computes what the actor may do, so the
   * pair is checked on a real request — just not by the guard, which is why
   * the decorator scan above cannot see it. Listed by hand because it cannot
   * be derived: the alternative is a spec that reports a live permission as
   * dead configuration and invites the next reader to delete it.
   *
   * Each entry names the file that enforces it, and the test below reads
   * that file and fails if the check is no longer there — so this list
   * cannot rot into a box of excuses.
   */
  const ENFORCED_IN_SERVICE_CODE = [
    { pair: 'committees:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
    { pair: 'documents:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
    { pair: 'governanceDocuments:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
    { pair: 'organizationalStructure:Publish', by: 'src/modules/workflow/publishing/publishing.service.ts' },
  ] as const;

  /**
   * Declared, not yet enforced, each with the batch that gives it a route.
   * Empty by owner decision: no pair may exist in the catalogue without an
   * enforcement path, not even temporarily. Kept as a structure, not deleted,
   * so the next attempt to declare an unenforced pair has to argue for
   * itself here instead of slipping into the catalogue unexamined — adding
   * an entry needs the owner.
   */
  const AWAITING_ITS_BATCH: ReadonlyArray<{ pair: string; batch: string }> = [];

  it('covers every permission pair a @RequirePermission decorator relies on', () => {
    const missing = [...usedPairs()].filter((pair) => !declaredPairs.has(pair)).sort();

    expect(missing).toEqual([]);
  });

  it('leaves no dead pair that is not either enforced elsewhere or booked into a batch', () => {
    const excused = [
      ...ENFORCED_IN_SERVICE_CODE.map((entry) => entry.pair),
      ...AWAITING_ITS_BATCH.map((entry) => entry.pair),
    ].sort();
    const used = usedPairs();
    const dead = [...declaredPairs].filter((pair) => !used.has(pair)).sort();

    expect(dead).toEqual(excused);
  });

  it('finds the service-level check behind every pair that claims one', () => {
    for (const { pair, by } of ENFORCED_IN_SERVICE_CODE) {
      const action = pair.split(':')[1];
      expect(readFileSync(join(process.cwd(), by), 'utf8')).toContain(`entityType, '${action}'`);
    }
  });

  it('books every awaiting pair into a real batch', () => {
    expect(AWAITING_ITS_BATCH.every((entry) => /^[0-9]+[ab]?$/.test(entry.batch))).toBe(true);
  });

  /** A derivation that returned nothing would make both directions above
   *  pass — neither has anything left to disagree with — so the floor is
   *  asserted here as well. */
  it('derives a realistic number of pairs', () => {
    expect(PERMISSION_CATALOGUE.length).toBeGreaterThan(250);
  });

  it('has no duplicates', () => {
    expect(declaredPairs.size).toBe(PERMISSION_CATALOGUE.length);
  });
});
