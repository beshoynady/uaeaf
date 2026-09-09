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
 * or falls back to `currentColor`, so a misspelt token reaches production
 * looking merely odd rather than broken (ADR-0059 §D5).
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

  /**
   * Properties this application declares in its own stylesheets.
   *
   * Not everything a component references is a design token. `--logo-ink` /
   * `--logo-green` / `--logo-red` (globals.css, Chapter 1 ADR-0002) exist
   * precisely because the brand colours must NOT become theme-dependent — the
   * indirection is the app's, so the declaration is the app's too, and minting
   * three semantic tokens for one component would be the silent system
   * evolution CLAUDE.md §16 forbids.
   *
   * Collected by reading the declarations rather than allowlisted by name, so
   * a typo in a component still fails: `var(--logo-inck)` matches no
   * declaration in either place.
   */
  const appDeclared = new Set(
    files
      .filter((file) => file.endsWith(".css"))
      .flatMap((file) =>
        [...readFileSync(file, "utf-8").matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map(
          ([, name]) => name,
        ),
      ),
  );

  it("declares the app-local properties it references, in its own CSS", () => {
    // Non-vacuity: if the scan silently found nothing, the rule below would
    // pass by accident for every app-local property.
    expect(appDeclared.has("--logo-ink")).toBe(true);
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
        if (declared.has(name) || appDeclared.has(name) || EXTERNAL.has(name)) continue;
        offenders.push(`${file.replace(SRC, "src").split("\\").join("/")}: ${name}`);
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  /**
   * The identity colours are not text colours.
   *
   * `--color-brand-primary` is Pantone 348 C and is declared in `base.css` —
   * one value for every theme, because Chapter 1 ADR-0003 and the guide's §5.1
   * forbid shifting it. That immutability is why it cannot carry text: it
   * cannot answer to the ground behind it, and no `var(--…)` check can see the
   * failure, since the token is real and correctly spelled. The semantic roles
   * carry a theme instead, and `register-contrast.spec.ts` measures them on
   * every ground. ADR-0063 D1.
   *
   * Scoped to `text-…` utilities: a brand-coloured fill, border or ring is the
   * identity used as identity.
   */  it("paints no text with an identity colour", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = stripComments(readFileSync(file, "utf-8"));
      for (const [match] of source.matchAll(
        /(?:^|[\s"'`])text-\[color:var\(--color-brand-[a-zA-Z0-9-]+\)\]/g,
      )) {
        offenders.push(`${file.replace(SRC, "src").split("\\").join("/")}: ${match}`);
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });
});
