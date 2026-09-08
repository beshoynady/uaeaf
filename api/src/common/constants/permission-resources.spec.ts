import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PERMISSION_RESOURCES } from './permission-resources.js';

/** The whole point of `PERMISSION_RESOURCES` is that it stays in lockstep
 *  with what the codebase actually guards. A list that drifts is worse than
 *  no list: it re-opens the silent-typo hole it was added to close, while
 *  looking authoritative. This suite enforces the invariant mechanically
 *  instead of trusting a comment. */
describe('PERMISSION_RESOURCES', () => {
  const sourceRoot = join(process.cwd(), 'src');

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });

  const usedResourceTypes = (): Set<string> => {
    const found = new Set<string>();
    for (const file of walk(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/@RequirePermission\(\s*'([^']+)'/g)) {
        found.add(match[1]);
      }
    }
    return found;
  };

  it('covers every resourceType actually used by a @RequirePermission decorator', () => {
    const declared = new Set<string>(PERMISSION_RESOURCES);
    const missing = [...usedResourceTypes()].filter((resource) => !declared.has(resource)).sort();

    expect(missing).toEqual([]);
  });

  it('declares no resource that nothing in the codebase guards', () => {
    const used = usedResourceTypes();
    const dead = PERMISSION_RESOURCES.filter((resource) => !used.has(resource)).sort();

    // A declared-but-unguarded resource is dead configuration: it can be
    // granted in the dashboard and will never gate anything.
    expect(dead).toEqual([]);
  });

  it('has no duplicates', () => {
    expect(new Set(PERMISSION_RESOURCES).size).toBe(PERMISSION_RESOURCES.length);
  });
});
