import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every `@property` registration uses a syntax the browser accepts.
 *
 * An invalid `syntax` invalidates the whole rule, silently: the property stays
 * an untyped custom property, and whatever the registration was for (here, that
 * a malformed focal point from a record is ignored) never happens. The
 * production build reported four (`<position>`, which is not a registrable
 * component) on 2026-09-17; the dev server said nothing.
 *
 * The components are the CSS Properties and Values API's list.
 */
const COMPONENTS = new Set([
  "length",
  "number",
  "percentage",
  "length-percentage",
  "color",
  "image",
  "url",
  "integer",
  "angle",
  "time",
  "resolution",
  "transform-function",
  "custom-ident",
  "transform-list",
  "string",
]);

const STYLES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "styles");

const registrations = () =>
  readdirSync(STYLES)
    .filter((file) => file.endsWith(".css"))
    .flatMap((file) =>
      [...readFileSync(join(STYLES, file), "utf8").matchAll(/@property\s+(--[\w-]+)\s*\{[^}]*syntax:\s*"([^"]*)"/g)].map((match) => ({
        file,
        name: match[1],
        syntax: match[2],
      })),
    );

/** Whether one `syntax` string is valid: `*`, or `|`-separated terms, each a
 *  component in angle brackets (optionally `+` or `#`) or a plain identifier. */
const validSyntax = (syntax: string): boolean =>
  syntax.trim() === "*" ||
  syntax.split("|").every((term) => {
    const trimmed = term.trim();
    const component = trimmed.match(/^<([\w-]+)>[+#]?$/);
    if (component) return COMPONENTS.has(component[1]);
    return /^[A-Za-z_][\w-]*$/.test(trimmed);
  });

describe("@property registrations", () => {
  it("finds the registrations it checks", () => {
    expect(registrations().length).toBeGreaterThan(0);
  });

  it("recognises an invalid component", () => {
    expect(validSyntax("<position>")).toBe(false);
    expect(validSyntax("<length-percentage>+")).toBe(true);
  });

  it("uses only syntaxes the browser accepts", () => {
    const invalid = registrations()
      .filter((registration) => !validSyntax(registration.syntax))
      .map(({ file, name, syntax }) => `${file} ${name}: ${syntax}`);
    expect(invalid).toEqual([]);
  });
});
