import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { declaredTokens, stripComments } from "@uaeaf/design-tokens/testing";

/**
 * Every `var(--…)` this application references must exist.
 *
 * CSS custom properties fail silently. `var(--color-border-subtle)` where no
 * such property is declared does not throw, does not warn, and does not fail
 * type-checking — the declaration is simply dropped and the element inherits
 * or falls back to `currentColor`. Two of them shipped to the dashboard in
 * production before anything was looking (ADR-0059 §D5): one turned 170 row
 * separators into `currentColor`, the other left a destructive button's label
 * resolving by inheritance over a red ground.
 *
 * The dashboard has the same guard. It is duplicated rather than shared
 * because the two applications have different allowlists and different source
 * trees; what *is* shared — reading the generated stylesheets — lives in
 * `@uaeaf/design-tokens/testing`.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Properties that legitimately have no token.
 *
 * `--font-*` are minted at runtime by `next/font`, which generates a hashed
 * family name per build; `--rise-index` is a component-local counter declared
 * with `@property` in `styles/motion.css`. Each is named individually — a
 * pattern-based exemption would hide the next real typo that happens to
 * match it.
 */
const EXTERNAL = new Set([
  "--font-alexandria",
  "--font-ibm-plex-sans",
  "--font-ibm-plex-mono",
  "--rise-index",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry) && !/\.(spec|test)\./.test(entry) ? [full] : [];
  });
}

describe("token contract", () => {
  const declared = declaredTokens();
  const files = sourceFiles(SRC);

  it("finds sources to check, so the rule below cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("references no custom property the token build does not declare", () => {
    const offenders: string[] = [];

    for (const file of files) {
      // Comments blanked: `section.tsx` quotes the exact anti-pattern it
      // warns against — a template literal building a token name — and a
      // rule that reads prose reports the warning as the violation.
      const source = stripComments(readFileSync(file, "utf-8"));
      // Deliberately brace-free: `var(--x, fallback)` and `var(--x)` both
      // start the same way, and matching to the closing brace would fail on
      // a nested `var()`.
      for (const [, name] of source.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
        if (declared.has(name) || EXTERNAL.has(name)) continue;
        offenders.push(`${file.replace(SRC, "src").split("\\").join("/")}: ${name}`);
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });
});
