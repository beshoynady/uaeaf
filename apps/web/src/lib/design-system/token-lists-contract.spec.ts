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

  // Reads every source file of both applications and the token CSS: seconds on
  // the project drive, and past Vitest's default 5s while the whole web suite
  // runs its files at once (seen 7.7s). The time is spent reading, not measuring.
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
  }, 30_000);
});

describe("the application uses roles, not ramp steps (Chapter 7 §7.7)", () => {
  const RAMP = /var\(--color-(?:(?:green|red|neutral-warm|gold|silver|bronze|steel-blue|teal|desert-sand|success|error|warning|info)-\d{2,3}|black|white)\)/g;

  /**
   * The dev-only colour review renders the candidate ramps themselves; it
   * answers 404 in production and is linked from nowhere.
   */
  const EXCLUDED = ["apps/web/src/app/api/colour-review/"];

  /**
   * Usages with no role to move to yet, by file and count, each with its
   * reason. Empty since ADR-0072 D13: every use has a role. An entry added
   * here names the file, the count and why no role exists, and has to shrink.
   */
  const PENDING: Record<string, { count: number; reason: string }> = {};

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

/**
 * 4. Item distinction (ADR-0072 D1): the four item colours that mark cards in a
 *    closed set (goals, values) are told apart by their ink, the colour of the
 *    card's number and icon.
 *
 * - Among the four inks: ΔE ≥ 10 in the worst of normal, deuteranope and
 *   protanope vision. The number and the title already tell the cards apart,
 *   so colour is a second cue (WCAG 1.4.1), not the only one.
 * - Against every resting state colour and its text name: ΔE ≥ 15 under the
 *   same three visions, because an item read as an error or a success
 *   misinforms. The `-hover` variants are not in the set: they appear only
 *   under the pointer on a labelled control, never as a sign on their own.
 *   Measured with them, light has no set at all (desert sand .800 ↔
 *   `error-hover` 12.85; green .200 ↔ dark `success-hover` 8.22).
 * - High contrast draws the items without hue: no step of desert sand clears
 *   both 15 from that theme's dark state colours and 3:1 on white.
 *
 * Simulation: Viénot, Brettel and Mollon (1999) as one linear-RGB matrix per
 * deficiency; ΔE is CIE76 on CIELAB (D65), compared unrounded.
 */
/**
 * How far apart two colours are for the reader who tells them apart worst:
 * CIE76 on CIELAB (D65) under normal vision, deuteranopia and protanopia
 * (Viénot, Brettel and Mollon 1999), the smallest of the three. ADR-0072 D1
 * set the method for the item colours; ADR-0088 holds the two accents to it.
 */
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const multiply = (a: number[][], b: number[][]) =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const apply = (m: number[][], v: number[]) => m.map((row) => row.reduce((sum, value, k) => sum + value * v[k], 0));

const RGB_TO_LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS_TO_RGB = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];
const SIMULATION = {
  protan: multiply(LMS_TO_RGB, multiply([[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]], RGB_TO_LMS)),
  deutan: multiply(LMS_TO_RGB, multiply([[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]], RGB_TO_LMS)),
};
const VISIONS = ["normal", "deutan", "protan"] as const;

const lab = (hex: string, vision: (typeof VISIONS)[number]) => {
  const rgb = channels(hex).map(linear);
  const [r, g, b] = (vision === "normal" ? rgb : apply(SIMULATION[vision], rgb)).map((c) => Math.min(1, Math.max(0, c)));
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const fy = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const fz = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const worst = (a: string, b: string) =>
  Math.min(
    ...VISIONS.map((vision) => {
      const [p, q] = [lab(a, vision), lab(b, vision)];
      return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    }),
  );

describe("the four item colours stay apart (ADR-0072 D1)", () => {
  const ITEMS = [1, 2, 3, 4] as const;
  const ROLES = ["surface", "ink", "edge"] as const;
  const AMONG = 10;
  const FROM_STATES = 15;
  const HUED = ["light", "dark"] as const;

  it.each(THEMES)("declares a surface, an ink and an edge for every item in the %s list", (theme) => {
    const values = resolved(theme);
    const missing = ITEMS.flatMap((item) => ROLES.map((role) => `--color-item-${item}-${role}`)).filter(
      (name) => !HEX.test(values[name] ?? ""),
    );
    expect(missing).toEqual([]);
  });

  it.each(HUED)("keeps the four inks at least 10 apart under every vision in %s", (theme) => {
    const values = resolved(theme);
    const failures: string[] = [];
    let pairs = 0;
    for (const a of ITEMS)
      for (const b of ITEMS.filter((other) => other > a)) {
        const [x, y] = [values[`--color-item-${a}-ink`], values[`--color-item-${b}-ink`]];
        if (!HEX.test(x ?? "") || !HEX.test(y ?? "")) continue;
        pairs += 1;
        const d = worst(x, y);
        if (d < AMONG) failures.push(`item ${a} ${x} ↔ item ${b} ${y}: ${d.toFixed(2)} < ${AMONG}`);
      }
    expect(pairs, "six pairs measured").toBe(6);
    expect(failures).toEqual([]);
  });

  it.each(HUED)("keeps every ink at least 15 from every state colour under every vision in %s", (theme) => {
    const values = resolved(theme);
    const states = Object.entries(values).filter(
      ([name, value]) => /^--color-semantic-(success|error|warning|info)(-text)?$/.test(name) && HEX.test(value),
    );
    const failures: string[] = [];
    let inks = 0;
    for (const item of ITEMS) {
      const ink = values[`--color-item-${item}-ink`];
      if (!HEX.test(ink ?? "")) continue;
      inks += 1;
      for (const [name, value] of states) {
        const d = worst(ink, value);
        if (d < FROM_STATES) failures.push(`item ${item} ${ink} ↔ ${name} ${value}: ${d.toFixed(2)} < ${FROM_STATES}`);
      }
    }
    expect(inks, "four inks measured").toBe(4);
    expect(states.length, "the four states and their text names").toBeGreaterThanOrEqual(8);
    expect(failures).toEqual([]);
  });

  // ADR-0074 D2: the values stand on the green register on both pages, and the
  // owner's condition is a card boundary of 3:1 there in dark. Each ramp's 200
  // step clears it, and the page grounds as well.
  it("draws every item's edge at 3:1 or more in dark, against the page grounds and the green register", () => {
    const values = resolved("dark");
    const luminance = (hex: string) => {
      const [r, g, b] = channels(hex).map(linear);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const grounds = ["--color-surface-base", "--color-surface-sunken", "--color-section-green-surface"];
    const failures = ITEMS.flatMap((item) =>
      grounds.flatMap((ground) => {
        const [edge, under] = [values[`--color-item-${item}-edge`], values[ground]];
        if (!HEX.test(edge ?? "") || !HEX.test(under ?? "")) return [`item ${item} edge or ${ground} is missing`];
        const measured = ratio(edge, under);
        return measured < 3 ? [`item ${item} edge ${edge} on ${ground} ${under}: ${measured.toFixed(2)} < 3`] : [];
      }),
    );
    expect(failures).toEqual([]);
  });

  it("draws the items without hue in high contrast: the raised ground, the primary ink, the strong edge", () => {
    const values = resolved("high-contrast");
    const drift = ITEMS.flatMap((item) =>
      [
        [`--color-item-${item}-surface`, "--color-surface-raised"],
        [`--color-item-${item}-ink`, "--color-text-primary"],
        [`--color-item-${item}-edge`, "--color-border-strong"],
      ]
        .filter(([name, role]) => !HEX.test(values[name] ?? "") || values[name] !== values[role])
        .map(([name, role]) => `${name} ${values[name]} is not ${role} ${values[role]}`),
    );
    expect(drift).toEqual([]);
  });
});

/**
 * 5. The logo plate (ADR-0085 D6.1, D8 #3): the white ground a sponsor's,
 *    partner's or membership's mark is set on, so a supplied file's own white
 *    does not show as a box.
 *
 * `--color-logo-plate` is `#FFFFFF` in all three lists, because that is what
 * the marks arrive on. What changes underneath it is the register:
 *
 * - The black register (the strip and the banner) is `#000000` in light and
 *   high contrast and `#4A4942` in dark. The plate's own fill bounds it in
 *   every list.
 * - The green register (partners) is `#005226` in light and dark, where the
 *   fill bounds it too — and `#FFFFFF` in high contrast, where the plate, the
 *   card holding it and the band behind them become one white field. Measured
 *   1:1, which is what D8 #3 recorded and what left the green register out of
 *   the pairing record rather than fixed.
 *
 * So the plate draws its own edge in the high-contrast list and in
 * forced-colors and nowhere else (`apps/web/src/styles/motion.css`), and the
 * green register is now recorded. The record carries an exemption because a
 * single floor cannot express "the fill bounds it here and the edge bounds it
 * there"; these are the measurements that exemption stands on.
 */
describe("the logo plate is a bounded object on every register (ADR-0085 D8 #3)", () => {
  const PLATE = "--color-logo-plate";
  const REGISTERS = ["--color-section-black-surface", "--color-section-green-surface"];

  it.each(["light", "dark"] as const)("is bounded by its own fill on both registers in %s", (theme) => {
    const values = resolved(theme);
    const failures = REGISTERS.flatMap((register) => {
      const ratio = contrastRatio(values[PLATE], values[register]);
      return ratio < AA_LARGE_TEXT_OR_NON_TEXT
        ? [`${PLATE} ${values[PLATE]} on ${register} ${values[register]}: ${ratio.toFixed(3)} < ${AA_LARGE_TEXT_OR_NON_TEXT}`]
        : [];
    });
    expect(failures).toEqual([]);
  });

  it("is not bounded by its own fill on the green register in high contrast — the premise of the edge", () => {
    // Asserted rather than assumed. If that register ever stops being white
    // here, the edge below is answering a problem that no longer exists and
    // D8 #3 should be read again rather than carried forward.
    const values = resolved("high-contrast");
    expect(values["--color-section-green-surface"]).toBe(values[PLATE]);
  });

  it("keeps the black register bounding the plate by fill in high contrast, where it stays black", () => {
    // Only one register loses its boundary in that list. The edge below is
    // drawn on every plate all the same, because a plate does not know which
    // register it is standing on — on this one it simply lands on a ground
    // that is already the same colour.
    const values = resolved("high-contrast");
    const ratio = contrastRatio(values[PLATE], values["--color-section-black-surface"]);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
  });

  it("draws an edge in high contrast that bounds the plate against the register that lost its fill boundary", () => {
    const values = resolved("high-contrast");
    const edge = values["--color-border-strong"];
    const failures = [PLATE, "--color-section-green-surface"].flatMap((against) => {
      const ratio = contrastRatio(edge, values[against]);
      return ratio < AA_LARGE_TEXT_OR_NON_TEXT
        ? [`--color-border-strong ${edge} on ${against} ${values[against]}: ${ratio.toFixed(3)} < ${AA_LARGE_TEXT_OR_NON_TEXT}`]
        : [];
    });
    expect(failures).toEqual([]);
  });

  it("records the green register as a partner, with the reason the floor is not a single number", () => {
    const record = (JSON.parse(readFileSync(PAIRINGS, "utf-8")) as { tokens: Record<string, Pairing> }).tokens[PLATE];
    expect(record.partners).toContain("--color-section-green-surface");
    expect(record.partners).toContain("--color-section-black-surface");
    expect(record.exempt ?? "").toContain("D8 #3");
  });
});

describe("the two accents mean one thing each, and nothing that is already meant (ADR-0088)", () => {
  const ACCENTS = ["--color-accent-live", "--color-accent-track"] as const;
  const FROM_MEANING = 15;
  const FROM_ROLES = 10;
  const HUED = ["light", "dark"] as const;

  /** What a colour already says on this site. A new one that could be taken
   *  for any of these says it too, whatever its token is called. */
  const MEANING = /^--color-semantic-(success|error|warning|info)(-text)?$|^--color-semantic-medal-(gold|silver|bronze)$|^--color-logo-pinned-edge$/;
  const ROLES = /^--color-item-[1-4]-ink$|^--color-category-[1-5]$|^--color-accent-(information|classification|featured)$|^--color-border-accent$|^--color-text-link$|^--color-brand-(primary|secondary)$/;

  it.each(THEMES)("declares both in the %s list", (theme) => {
    const values = resolved(theme);
    expect(ACCENTS.filter((name) => !HEX.test(values[name] ?? ""))).toEqual([]);
  });

  it.each(HUED)("keeps both at least 15 from every state, every medal and the held sponsor's edge in %s", (theme) => {
    const values = resolved(theme);
    const taken = Object.entries(values).filter(([name, value]) => MEANING.test(name) && HEX.test(value));
    expect(taken.length, "colours with a meaning, found").toBeGreaterThanOrEqual(12);
    const failures = ACCENTS.flatMap((accent) =>
      taken
        .map(([name, value]) => ({ name, value, d: worst(values[accent], value) }))
        .filter(({ d }) => d < FROM_MEANING)
        .map(({ name, value, d }) => `${accent} ${values[accent]} ↔ ${name} ${value}: ${d.toFixed(2)} < ${FROM_MEANING}`),
    );
    expect(failures).toEqual([]);
  });

  it.each(HUED)("keeps both at least 10 from every role colour, and from each other, in %s", (theme) => {
    const values = resolved(theme);
    const roles = Object.entries(values).filter(([name, value]) => ROLES.test(name) && HEX.test(value));
    expect(roles.length, "role colours found").toBeGreaterThanOrEqual(14);
    const failures = ACCENTS.flatMap((accent) =>
      roles
        .map(([name, value]) => ({ name, value, d: worst(values[accent], value) }))
        .filter(({ d }) => d < FROM_ROLES)
        .map(({ name, value, d }) => `${accent} ${values[accent]} ↔ ${name} ${value}: ${d.toFixed(2)} < ${FROM_ROLES}`),
    );
    expect(failures).toEqual([]);
    expect(worst(values[ACCENTS[0]], values[ACCENTS[1]])).toBeGreaterThanOrEqual(FROM_ROLES);
  });

  it("keeps the live accent's hue in high contrast, where it clears the states of that list too", () => {
    const values = resolved("high-contrast");
    const states = Object.entries(values).filter(([name, value]) => /^--color-semantic-(success|error|warning|info)(-text)?$/.test(name) && HEX.test(value));
    expect(states.length).toBeGreaterThanOrEqual(8);
    expect(states.filter(([, value]) => worst(values["--color-accent-live"], value) < FROM_MEANING)).toEqual([]);
  });

  it("draws the track mark without hue in high contrast: no step of it clears both bars there", () => {
    expect(resolved("high-contrast")["--color-accent-track"].toUpperCase()).toBe("#FFFFFF");
  });

  it("uses the live accent nowhere yet: it waits for the results pages (owner decision 2026-09-18)", () => {
    const users = [...sources(SRC), ...sources(join(ROOT, "apps", "dashboard", "src"))]
      .filter((file) => readFileSync(file, "utf-8").includes("--color-accent-live"))
      .map(relative);
    expect(users).toEqual([]);
  });
});
