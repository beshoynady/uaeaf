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

const BUILD_CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "css");

/** Every custom property the token build declares, in any theme. */
export function declaredTokens(): Set<string> {
  const declared = new Set<string>();
  for (const file of readdirSync(BUILD_CSS).filter((name) => name.endsWith(".css"))) {
    const source = readFileSync(join(BUILD_CSS, file), "utf-8");
    for (const [, name] of source.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) {
      declared.add(name);
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
