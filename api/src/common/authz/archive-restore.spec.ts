import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CAPABILITY_MAP } from './capability-map.js';
import {
  assertArchivedFirst,
  refuseWithoutStepUp,
  UnavailableStepUpVerifier,
} from './archive-restore.js';

describe('assertArchivedFirst', () => {
  it('passes a record that was archived', () => {
    expect(() => assertArchivedFirst({ archivedAt: new Date() }, 'MediaAsset abc')).not.toThrow();
  });

  it('refuses a live record, naming what has to happen first', () => {
    let thrown: unknown;
    try {
      assertArchivedFirst({ archivedAt: null }, 'MediaAsset abc');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    expect((thrown as ConflictException).getResponse()).toMatchObject({
      code: 'conflict',
      message: expect.stringContaining('Archive it first'),
    });
  });
});

describe('refuseWithoutStepUp', () => {
  it('refuses with the step-up code, whatever it is asked about', () => {
    let thrown: unknown;
    try {
      refuseWithoutStepUp('MediaAsset abc');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect((thrown as ForbiddenException).getResponse()).toMatchObject({
      code: 'mfa_step_up_required',
    });
  });

  it('never returns, so no caller can carry on past it', () => {
    expect(() => refuseWithoutStepUp('anything')).toThrow(ForbiddenException);
  });
});

/**
 * The routes that destroy something are exactly the resources the map allows to
 * be destroyed, both directions, read off the source.
 *
 * `capability-map.spec.ts` pins the purgeable set by name and refuses the verb
 * elsewhere in the map; `permission-catalogue.spec.ts` refuses a decorator whose
 * pair the map does not declare. Neither notices a purgeable resource whose
 * route has gone — a `PermanentDelete` grant an administrator holds that destroys
 * nothing — nor a third irreversible route appearing beside a map entry someone
 * edited in the same change.
 */
describe('the permanent delete routes', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory()
        ? walk(full)
        : full.endsWith('.controller.ts')
          ? [full]
          : [];
    });

  const resourcesWithAPurgeRoute = (): string[] => {
    const found = new Set<string>();
    for (const file of walk(join(process.cwd(), 'src'))) {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ');
      for (const match of source.matchAll(
        /@RequirePermission\(\s*'([^']+)'\s*,\s*'PermanentDelete'\s*\)/g,
      )) {
        found.add(match[1]);
      }
    }
    return [...found].sort();
  };

  it('exist for every purgeable resource and for no other', () => {
    const purgeable = CAPABILITY_MAP.filter((entry) => entry.purgeable)
      .map((entry) => entry.resourceType)
      .sort();

    expect(resourcesWithAPurgeRoute()).toEqual(purgeable);
  });

  /** A walk that found nothing would pass the assertion above the day the map
   *  is emptied too. */
  it('finds the routes at all', () => {
    expect(resourcesWithAPurgeRoute()).toEqual(['contactMessages', 'mediaAssets']);
  });
});

/**
 * Step-up is bound in one place, and the only thing bound there refuses.
 *
 * The check moved out of the controllers into the services, which is what makes
 * it unskippable — and that leaves exactly one way to disable it silently:
 * binding a permissive verifier. This scans for the binding instead of trusting
 * it, because the two service-level negative tests inject their own verifier and
 * so cannot see what the application actually wires.
 */
describe('the step-up verifier binding', () => {
  const sourceOf = (file: string): string =>
    readFileSync(join(process.cwd(), 'src', file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });

  it('binds UnavailableStepUpVerifier, which refuses every caller', () => {
    expect(sourceOf('common/authz/step-up.module.ts')).toContain(
      'provide: STEP_UP_VERIFIER, useClass: UnavailableStepUpVerifier',
    );
  });

  it('is bound nowhere else, so there is one implementation to replace', () => {
    const bindings = walk(join(process.cwd(), 'src'))
      .filter((file) => !file.endsWith('.spec.ts'))
      .filter((file) => /provide:\s*STEP_UP_VERIFIER/.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(/\\/g, '/').split('/src/')[1]);

    expect(bindings).toEqual(['common/authz/step-up.module.ts']);
  });

  it('refuses, rather than resolving, when asked to verify', async () => {
    await expect(new UnavailableStepUpVerifier().assertVerified('anything')).rejects.toMatchObject({
      response: { code: 'mfa_step_up_required' },
    });
  });
});
