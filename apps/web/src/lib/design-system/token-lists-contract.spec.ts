import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AA_LARGE_TEXT_OR_NON_TEXT, AA_NORMAL_TEXT, contrastRatio, stripComments } from "@uaeaf/design-tokens/testing";

/**
 * The three colour lists, kept whole and kept readable (ADR-0071 D4).
 *
 * The rule: no colour enters a list without its counterpart in the other two,
 * and without its measurement. Nothing enforced either before this file. A
 * name missing from `dark.css` does not fail the build: the dark theme quietly
 * shows the light value, because `<html>` still matches `:root`. And a pair
 * whose two sides follow the theme differently fails in one theme only, which
 * is how the primary button's label measured 4.37 / 3.15 / 2.23 on the dark
 * theme while every light measurement passed.
 *
 * 1. Symmetry: the colour names in `light.css`, `dark.css` and
 *    `high-contrast.css` are the same set.
 * 2. Pairings: every colour in every list has a record in
 *    `tokens/semantic/pairings.json` naming what it is measured against and
 *    its floor, and every pair clears that floor in every theme, compared on
 *    the unrounded ratio. A record may be exempt only with a written reason,
 *    and may name no partner only while nothing in either application uses
 *    the colour, so an unmeasured colour cannot also be a used one.
 * 3. Consumption: the application does not reach past the roles into a ramp
 *    step (Chapter 7 §7.7). Usages that have no role to move to yet are
 *    listed below by file and count, each with its reason, and the list has
 *    to shrink when one is moved.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOT = join(SRC, "..", "..", "..");
const BUILD_CSS = join(ROOT, "packages", "design-tokens", "build", "css");
const PAIRINGS = join(ROOT, "packages", "design-tokens", "tokens", "semantic", "pairings.json");

const THEMES = ["light", "dark", "high-contrast"] as const;
type Theme = (typeof THEMES)[number];

const HEX = /^#[0-9A-Fa-f]{6}$/;

const declarations = (file: string): Record<string, string> =>
  Object.fromEntries(
    [...readFileSync(join(BUILD_CSS, file), "utf-8").matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  );

/** The names a theme's own list declares with a colour value. */
const colourNames = (theme: Theme): Set<string> =>
  new Set(Object.entries(declarations(`${theme}.css`)).filter(([, value]) => HEX.test(value)).map(([name]) => name));

/** What the cascade resolves in a theme: `base.css`, then the theme's list. */
const resolved = (theme: Theme): Record<string, string> => ({ ...declarations("base.css"), ...declarations(`${theme}.css`) });

interface Pairing {
  kind: "text" | "ground" | "shape";
  partners: string[];
  min: number;
  basis: string;
  /** Why this colour carries no floor: WCAG's own exemption, or a decorative rule. */
  exempt?: string;
  /** Why no partner is named: nothing uses the colour yet. */
  unpaired?: string;
}

const FLOOR: Record<Pairing["kind"], number> = {
  text: AA_NORMAL_TEXT,
  ground: AA_NORMAL_TEXT,
  shape: AA_LARGE_TEXT_OR_NON_TEXT,
};

const sources = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) return sources(full);
        return /\.(tsx?|css)$/.test(entry) && !/\.(spec|test)\./.test(entry) ? [full] : [];
      })
    : [];

const relative = (file: string) => file.replace(ROOT, "").split("\\").join("/").replace(/^\//, "");

describe("the three lists name the same colours", () => {
  const lists = Object.fromEntries(THEMES.map((theme) => [theme, colourNames(theme)])) as Record<Theme, Set<string>>;

  it("finds colours to compare, so the rule cannot pass on empty lists", () => {
    for (const theme of THEMES) expect(lists[theme].size, theme).toBeGreaterThan(50);
  });

  it.each(["dark", "high-contrast"] as const)("light and %s declare the same colour names", (theme) => {
    const missing = [...lists.light].filter((name) => !lists[theme].has(name)).map((name) => `${theme} lacks ${name}`);
    const extra = [...lists[theme]].filter((name) => !lists.light.has(name)).map((name) => `light lacks ${name}`);
    expect([...missing, ...extra]).toEqual([]);
  });
});

describe("every colour is measured against what it sits on", () => {
  it("has a pairings record", () => {
    expect(existsSync(PAIRINGS), "packages/design-tokens/tokens/semantic/pairings.json exists").toBe(true);
  });

  const pairings: Record<string, Pairing> = existsSync(PAIRINGS)
    ? (JSON.parse(readFileSync(PAIRINGS, "utf-8")) as { tokens: Record<string, Pairing> }).tokens
    : {};
  const everyColour = new Set(THEMES.flatMap((theme) => [...colourNames(theme)]));

  it("records every colour in every list, and nothing that no list declares", () => {
    const unrecorded = [...everyColour].filter((name) => !pairings[name]).map((name) => `no record for ${name}`);
    const stale = Object.keys(pairings).filter((name) => !everyColour.has(name)).map((name) => `record for undeclared ${name}`);
    expect([...unrecorded, ...stale]).toEqual([]);
  });

  it("holds each record to its kind's floor, unless the record says why not", () => {
    const offenders: string[] = [];
    for (const [name, record] of Object.entries(pairings)) {
      if (!record.basis) offenders.push(`${name}: no basis`);
      if (record.unpaired !== undefined) {
        if (record.partners.length > 0 || !record.unpaired.trim()) offenders.push(`${name}: unpaired records name no partner and give a reason`);
        continue;
      }
      if (record.partners.length === 0) offenders.push(`${name}: no partner`);
      if (record.exempt !== undefined) {
        if (!record.exempt.trim()) offenders.push(`${name}: an exemption needs its reason`);
        continue;
      }
      if (record.min !== FLOOR[record.kind]) offenders.push(`${name}: ${record.kind} floor is ${FLOOR[record.kind]}, record says ${record.min}`);
    }
    expect(offenders).toEqual([]);
  });

  it("names a partner only where one exists", () => {
    const offenders: string[] = [];
    for (const theme of THEMES) {
      const values = resolved(theme);
      for (const [name, record] of Object.entries(pairings))
        for (const partner of record.partners)
          if (!HEX.test(partner) && !HEX.test(values[partner] ?? "")) offenders.push(`${theme}: ${name} → ${partner} resolves to no colour`);
    }
    expect(offenders).toEqual([]);
  });

  it.each(THEMES)("clears every floor in the %s theme", (theme) => {
    const values = resolved(theme);
    const failures: string[] = [];
    for (const [name, record] of Object.entries(pairings)) {
      if (record.exempt !== undefined || record.unpaired !== undefined) continue;
      for (const partner of record.partners) {
        const other = HEX.test(partner) ? partner : values[partner];
        if (!HEX.test(values[name] ?? "") || !HEX.test(other ?? "")) continue;
        // Unrounded: a 2.996 once passed a script as "3.00".
        const ratio = contrastRatio(values[name], other);
        if (ratio < record.min) failures.push(`${name} ${values[name]} on ${partner} ${other}: ${ratio.toFixed(3)} < ${record.min}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("leaves a colour unpaired only while nothing uses it", () => {
    const files = [join(ROOT, "apps", "web", "src"), join(ROOT, "apps", "dashboard", "src"), join(ROOT, "packages", "design-tokens", "css")]
      .flatMap(sources)
      .map((file) => ({ file, source: stripComments(readFileSync(file, "utf-8")) }));
    const offenders: string[] = [];
    for (const [name, record] of Object.entries(pairings)) {
      if (record.unpaired === undefined) continue;
      for (const { file, source } of files) if (source.includes(`var(${name})`)) offenders.push(`${name} is unpaired but used in ${relative(file)}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("the application uses roles, not ramp steps (Chapter 7 §7.7)", () => {
  const RAMP = /var\(--color-(?:(?:green|red|neutral-warm|gold|silver|bronze|steel-blue|teal|desert-sand|success|error|warning|info)-\d{2,3}|black|white)\)/g;

  /**
   * The dev-only colour review renders the candidate ramps themselves; it
   * answers 404 in production and is linked from nowhere.
   */
  const EXCLUDED = ["apps/web/src/app/api/colour-review/"];

  /**
   * Usages with no role to move to yet, by file and count. Each is open in
   * ADR-0071 D5; the count must fall to zero, and the entry be removed, when
   * the role exists.
   */
  const PENDING: Record<string, { count: number; reason: string }> = {
    "apps/web/src/components/pages/contact/contact-map.tsx": {
      count: 4,
      reason:
        "the outlined link's edge and its two tints (green.500), and the map marker (red.500); ADR-0068 D3 records Secondary and Tertiary as a DESIGN SYSTEM GAP with no button.secondary.* tokens, and the marker has no wayfinding role",
    },
    "apps/web/src/components/pages/vision-mission/strategy-cta.tsx": {
      count: 3,
      reason: "the outlined link's edge and its two tints (green.500), the same gap as the contact map's",
    },
    "apps/web/src/components/ui/surface.ts": {
      count: 1,
      reason: "the card icon's glyph (green.500): no role names an icon on a recessed chip, and the identity token is kept out of text utilities",
    },
  };

  it("finds no ramp step outside the recorded pending usages", () => {
    const counts: Record<string, number> = {};
    for (const file of sources(SRC)) {
      const path = relative(file);
      if (EXCLUDED.some((prefix) => path.startsWith(prefix))) continue;
      const found = [...stripComments(readFileSync(file, "utf-8")).matchAll(RAMP)].length;
      if (found > 0) counts[path] = found;
    }
    const expected = Object.fromEntries(Object.entries(PENDING).map(([path, { count }]) => [path, count]));
    expect(counts).toEqual(expected);
  });
});
