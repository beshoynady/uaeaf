import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AA_LARGE_TEXT_OR_NON_TEXT,
  AA_NORMAL_TEXT,
  contrastRatio,
  themeTokens,
} from "@uaeaf/design-tokens/testing";

/**
 * What the video system actually paints, measured.
 *
 * The system stands on ADR-0098's `ink` surface. `brand-surface-contract.spec`
 * measures what that surface publishes — its ink on its ground, in every
 * theme. This measures the pairs the video system composes on top of it, which
 * no surface can know about:
 *
 * - the two fills it mixes because the kit publishes no raised-on-ink step;
 * - the brand green it uses as a label colour rather than as a button plate;
 * - the live red, as a frame around the player and as a badge behind white;
 * - the focus indicator, whose two tones have to work on both fills.
 *
 * Read from the stylesheets rather than restated here: a number copied into a
 * test agrees with the design system only until one of the two is edited.
 */

const require_ = createRequire(import.meta.url);
const TOKENS_ROOT = dirname(require_.resolve("@uaeaf/design-tokens/package.json"));
const SURFACES_CSS = readFileSync(join(TOKENS_ROOT, "css", "surfaces.css"), "utf-8");

const THEMES = ["light", "dark", "high-contrast"] as const;

/** One surface's unthemed block, as declared. */
const surfaceBlock = (surface: string): Record<string, string> => {
  const declarations: Record<string, string> = {};
  for (const [, selector, body] of SURFACES_CSS.matchAll(
    new RegExp(`([^{}]*\[data-surface=["']${surface}["']\][^{]*)\{([^}]*)\}`, "g"),
  )) {
    if (selector.includes("[data-theme=")) continue;
    for (const [, name, value] of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
      declarations[name] = value.trim();
    }
  }
  if (Object.keys(declarations).length === 0) throw new Error(`surfaces.css declares no ${surface} block`);
  return declarations;
};

/** `var(--a)` chains, followed until a literal colour comes out. */
const resolve = (value: string, tokens: Record<string, string>): string => {
  let current = value.trim();
  for (let hop = 0; hop < 8; hop += 1) {
    const match = current.match(/^var\((--[a-zA-Z0-9-]+)\)$/);
    if (!match) return current;
    const next = tokens[match[1]];
    if (!next) throw new Error(`no token declares ${match[1]}`);
    current = next.trim();
  }
  throw new Error(`${value} does not resolve to a colour`);
};

/**
 * `color-mix(in srgb, fg P%, bg)`, computed the way the browser computes it.
 *
 * In channel space, then luminance -- blending the two luminances instead
 * reports a different and wrong number, which this project has been caught by
 * once already.
 */
const mix = (fg: string, percent: number, bg: string): string => {
  const channel = (hex: string, offset: number) => parseInt(hex.replace("#", "").slice(offset, offset + 2), 16);
  const blended = [0, 2, 4].map((offset) =>
    Math.round(channel(fg, offset) * (percent / 100) + channel(bg, offset) * (1 - percent / 100)),
  );
  return `#${blended.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

interface Pair {
  what: string;
  fg: string;
  bg: string;
  /** Normal text, or large text / a non-text boundary. */
  floor: number;
}

/** Every pair the video system composes, in one theme. */
const pairsFor = (theme: (typeof THEMES)[number]): Pair[] => {
  const tokens = themeTokens(theme);
  const ink = surfaceBlock("ink");
  const red = surfaceBlock("brand-red");
  const at = (block: Record<string, string>, name: string) => resolve(block[name], tokens);

  const ground = at(ink, "--surface-bg");
  const text = at(ink, "--surface-text");
  const muted = at(ink, "--surface-text-muted");
  const divider = at(ink, "--surface-divider");
  const green = at(ink, "--surface-btn-primary-bg");
  const onGreen = at(ink, "--surface-btn-primary-ink");

  // The two fills `video-system.css` mixes, because the kit publishes no
  // raised step on ink. Same expression, same order.
  const fill = mix(text, 6, ground);
  const fillStrong = mix(text, 10, ground);

  return [
    { what: "body text on the ground", fg: text, bg: ground, floor: AA_NORMAL_TEXT },
    { what: "body text on a card", fg: text, bg: fill, floor: AA_NORMAL_TEXT },
    { what: "body text on a field", fg: text, bg: fillStrong, floor: AA_NORMAL_TEXT },
    { what: "muted meta on the ground", fg: muted, bg: ground, floor: AA_NORMAL_TEXT },
    { what: "muted meta on a card", fg: muted, bg: fill, floor: AA_NORMAL_TEXT },
    // The green is a plate here, never a word: see the test below.
    { what: "the green plate against the ground", fg: green, bg: ground, floor: AA_LARGE_TEXT_OR_NON_TEXT },
    { what: "ink on the green button", fg: onGreen, bg: green, floor: AA_NORMAL_TEXT },
    // The badge's ground is a ramp, so both of its ends are measured: text
    // over a gradient is only as legible as its worst stop.
    {
      what: "ink on the live badge, at the ramp's start",
      fg: at(red, "--surface-text"),
      bg: at(red, "--surface-gradient-from"),
      floor: AA_NORMAL_TEXT,
    },
    {
      what: "ink on the live badge, at the ramp's end",
      fg: at(red, "--surface-text"),
      bg: at(red, "--surface-gradient-to"),
      floor: AA_LARGE_TEXT_OR_NON_TEXT,
    },
    // Boundaries, not text: WCAG 1.4.11.
    {
      what: "the live frame against the ground",
      fg: resolve("var(--color-brand-secondary)", tokens),
      bg: ground,
      floor: AA_LARGE_TEXT_OR_NON_TEXT,
    },
    { what: "the divider on a card", fg: divider, bg: fill, floor: 1 },
  ];
};

describe.each(THEMES)("the video system's colours in %s", (theme) => {
  it.each(pairsFor(theme))("$what clears $floor:1", ({ fg, bg, floor }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(floor);
  });

  /**
   * The focus indicator is two tones, and the promise is that ONE of them is
   * always visible -- which is the whole reason ADR-0051 draws a band as well
   * as a ring. In light theme the ring is black, and on this ground a black
   * ring is invisible; the white band beside it is what a reader sees.
   */
  it("keeps one tone of the focus indicator visible on both fills", () => {
    const tokens = themeTokens(theme);
    const ink = surfaceBlock("ink");
    const ground = resolve(ink["--surface-bg"], tokens);
    const text = resolve(ink["--surface-text"], tokens);
    const ring = resolve("var(--a11y-focus-ring)", tokens);
    const band = resolve("var(--a11y-focus-offset)", tokens);

    for (const behind of [ground, mix(text, 6, ground), mix(text, 10, ground)]) {
      const best = Math.max(contrastRatio(ring, behind), contrastRatio(band, behind));
      expect(best, `focus indicator on ${behind}`).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    }
  });

  /**
   * The brand green is the ink surface's button plate, and this is what stops
   * it from being used as a label colour again: on this ground it measures
   * 4.09:1, a fine boundary and unreadable text. The category label that used
   * to be green is the surface's own ink now, and the green survives only
   * where something legible is printed on top of it.
   */
  it("keeps the brand green a plate, never text on the ground", () => {
    const tokens = themeTokens(theme);
    const ink = surfaceBlock("ink");
    const ground = resolve(ink["--surface-bg"], tokens);
    const green = resolve(ink["--surface-btn-primary-bg"], tokens);
    expect(contrastRatio(green, ground)).toBeLessThan(AA_NORMAL_TEXT);
    expect(contrastRatio(resolve(ink["--surface-btn-primary-ink"], tokens), green)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });
});

/** Printed so the report's contrast table is generated rather than typed. */
it("prints the measured table", () => {
  const rows = THEMES.flatMap((theme) =>
    pairsFor(theme).map(({ what, fg, bg, floor }) => ({
      theme,
      pair: what,
      foreground: fg,
      background: bg,
      ratio: `${contrastRatio(fg, bg).toFixed(2)}:1`,
      floor: `${floor}:1`,
    })),
  );
  // `console.log`, not `console.table`: vitest forwards the first out of the
  // jsdom environment and swallows the second, so the table printed nowhere.
  console.log(
    rows
      .map(
        (r) =>
          `${r.theme.padEnd(14)} ${r.pair.padEnd(42)} ${r.foreground} on ${r.background} = ${r.ratio} (floor ${r.floor})`,
      )
      .join("\n"),
  );
  expect(rows.length).toBeGreaterThan(0);
});
