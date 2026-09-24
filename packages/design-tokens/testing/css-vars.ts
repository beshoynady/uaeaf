import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The generated stylesheets, read as data.
 *
 * CSS custom properties fail silently: `var(--typo)` neither throws, nor
 * warns, nor fails type-checking — it inherits, or resolves to nothing, and
 * the page renders wrong in a way no build step notices. Two such typos
 * shipped to production in this codebase before anything was looking
 * (ADR-0059 §D5). Everything here exists so a stylesheet can be diffed
 * against the tokens that actually exist.
 */

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_CSS = join(PACKAGE, "build", "css");

/**
 * Every custom property this package declares — generated or hand-written.
 *
 * Two sources, because the package has two. `build/css` is what the token
 * pipeline emits from `tokens/**`. `css/` is the hand-written layer beside it:
 * `forms.css`, `interaction.css` and `surfaces.css`, which declare real,
 * project-owned properties that no JSON token could express — a surface's
 * `--surface-*` set is conditional on an attribute, and a token file has no
 * way to say "when this element carries `data-surface=ink`".
 *
 * Reading only the generated half was this helper's blind spot: a stylesheet
 * that correctly consumed `--surface-text` was reported as referencing an
 * undeclared property, which is the opposite of what the rule is for. Widening
 * can only remove false offenders — it adds names, never drops them.
 */
export function declaredTokens(): Set<string> {
  const declared = new Set<string>();
  for (const dir of [BUILD_CSS, join(PACKAGE, "css")]) {
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
      const source = readFileSync(join(dir, file), "utf-8");
      for (const [, name] of source.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) {
        declared.add(name);
      }
    }
  }
  return declared;
}

/** One theme's resolved values, keyed by custom-property name. */
export function themeTokens(theme: "light" | "dark" | "high-contrast"): Record<string, string> {
  const values: Record<string, string> = {};
  // A theme file carries only what that theme redefines; base.css carries what
  // no theme changes. Reading base first and letting the theme win reproduces
  // what the cascade actually resolves to in the browser.
  for (const file of ["base.css", `${theme}.css`]) {
    const source = readFileSync(join(BUILD_CSS, file), "utf-8");
    for (const [, name, value] of source.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)) {
      values[name] = value.trim();
    }
  }
  return values;
}
