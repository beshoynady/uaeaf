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

  it('covers every permission pair a @RequirePermission decorator relies on', () => {
    const missing = [...usedPairs()].filter((pair) => !declaredPairs.has(pair)).sort();

    expect(missing).toEqual([]);
  });

  it('declares no pair that nothing in the codebase guards', () => {
    const used = usedPairs();
    const dead = [...declaredPairs].filter((pair) => !used.has(pair)).sort();

    expect(dead).toEqual([]);
  });

  it('has no duplicates', () => {
    expect(declaredPairs.size).toBe(PERMISSION_CATALOGUE.length);
  });
});
