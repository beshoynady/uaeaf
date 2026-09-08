import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The contract between what the app *asks for* and what the token package
 * *defines*.
 *
 * CSS custom properties fail silently. `var(--color-border-subtle)` on an
 * undefined name does not throw, does not warn, and does not show up in any
 * type check — the declaration is simply dropped and the element inherits.
 * That is how two real defects reached the running product and survived a
 * full green test suite, a passing production build, and a live CDP visual
 * pass:
 *
 *   - `--color-border-subtle` on every catalogue-lens row separator
 *   - `--color-text-on-brand` on the *destructive* Archive-role button, whose
 *     label colour therefore resolves by inheritance over a `#D32F2F` fill —
 *     an unverified contrast pair on the one action that cannot be undone.
 *
 * Neither is visible to a reviewer reading the diff, because both names look
 * exactly like the dozens of real ones beside them. So the check has to be
 * mechanical: every `var(--x)` the app references must be a name the token
 * package actually emits.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_SRC = join(HERE, "../..");
const TOKEN_CSS_DIR = join(HERE, "../../../../../packages/design-tokens/build/css");

/** Names supplied by something other than the token package. */
const EXTERNAL: ReadonlySet<string> = new Set([
  // next/font injects these at runtime (see app/[locale]/layout.tsx).
  "--font-alexandria",
  "--font-ibm-plex-sans",
  "--font-ibm-plex-mono",
  // Set inline on the element itself, per-instance.
  "--tone",
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx|ts|css)$/.test(entry) && !/\.(spec|test)\.tsx?$/.test(entry) ? [full] : [];
  });
}

function declaredTokens(): Set<string> {
  const declared = new Set<string>();
  for (const file of readdirSync(TOKEN_CSS_DIR).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(join(TOKEN_CSS_DIR, file), "utf-8");
    for (const [, name] of css.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) {
      declared.add(name);
    }
  }
  return declared;
}

/** Every `var(--x)` the app asks for, with the file that asks for it. */
function referencedTokens(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  for (const file of walk(APP_SRC)) {
    const source = readFileSync(file, "utf-8");
    // A file may also *define* a custom property (globals.css @theme block);
    // those are declarations, not requests, and are collected separately.
    const locallyDefined = new Set(
      [...source.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map(([, name]) => name),
    );
    for (const [, name] of source.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
      if (locallyDefined.has(name)) continue;
      refs.set(name, [...(refs.get(name) ?? []), file.replace(APP_SRC, "src")]);
    }
  }
  return refs;
}

describe("design token contract", () => {
  it("defines every custom property the dashboard references", () => {
    const declared = declaredTokens();
    const missing = [...referencedTokens()]
      .filter(([name]) => !declared.has(name) && !EXTERNAL.has(name))
      .map(([name, files]) => `${name} — referenced by ${[...new Set(files)].join(", ")}`);

    expect(missing).toEqual([]);
  });

  it("reads a token package that actually built", () => {
    // Guards the guard: if the build output were missing or empty the test
    // above would pass vacuously with an empty `declared` set only when the
    // app referenced nothing — but a partial build would silently weaken it.
    const declared = declaredTokens();
    expect(declared.size).toBeGreaterThan(100);
    expect(declared.has("--color-brand-primary")).toBe(true);
  });
});
