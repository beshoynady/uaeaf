import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every component and page source under `apps/web/src`, for the contract tests
 * that read the codebase as text.
 *
 * Several guards in this directory need the same list, and a second copy of a
 * walker is a second set of skip rules that drift: one guard stops looking
 * inside a directory the other still covers, and the difference is invisible
 * because both stay green. One walker, one set of rules.
 *
 * `.spec.tsx` and `.test.tsx` are excluded because a test that demonstrates a
 * forbidden pattern in order to assert it is forbidden is not an instance of
 * it — the same reason `stripComments` exists.
 */

const SRC = join(import.meta.dirname, "..", "..");

/**
 * The shared identity library, walked alongside this application's own tree.
 *
 * A rule about how a component may be composed has to see the components. The
 * ink-edge rule was written, run, and reported "no offenders" while examining
 * nothing at all, because the one place `<Surface kind="ink">` is written is
 * `PageHero` — inside the package, which this walker did not reach.
 */
const BRAND_UI = join(SRC, "..", "..", "..", "packages", "brand-ui");

const SKIP_DIRECTORIES = new Set(["node_modules", ".next", "test"]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return SKIP_DIRECTORIES.has(entry) ? [] : walk(full);
    }
    if (!/\.tsx$/.test(entry)) return [];
    if (/\.(spec|test)\.tsx$/.test(entry)) return [];
    return [full];
  });

/**
 * @param root Directory to walk, relative to `apps/web/src`. Omitted, the walk
 *             covers this application's whole `src` **and** `@uaeaf/brand-ui`,
 *             because a rule about component composition has to see the
 *             components wherever they live.
 */
export const sourceFiles = (root?: string): string[] =>
  root === undefined ? [...walk(SRC), ...walk(BRAND_UI)] : walk(join(SRC, root));
