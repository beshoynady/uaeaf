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
 * The five Brand UI Kit surfaces, and the three decisions that are only real
 * if a test holds them (ADR-0098 §8.2, §8.4).
 *
 * A surface publishes a fixed set of on-surface custom properties, and every
 * component in the kit reads them from the cascade rather than taking a prop
 * that says which background it is on. That mechanism has one failure mode
 * worth testing: a surface that publishes a value the surface cannot carry.
 * Nothing in CSS complains — `var(--surface-text-muted)` resolves, the text
 * paints, and it is unreadable.
 */

const require_ = createRequire(import.meta.url);
const TOKENS_ROOT = dirname(require_.resolve("@uaeaf/design-tokens/package.json"));
const SURFACES_CSS = readFileSync(join(TOKENS_ROOT, "css", "surfaces.css"), "utf-8");

const THEMES = ["light", "dark", "high-contrast"] as const;
// `raised` is the neutral plate a card paints inside a section; it is a
// surface in every sense that matters here, so it is measured like the rest.
const SURFACES = [
  "canvas",
  "raised",
  "photo-light",
  "brand-green",
  "brand-red",
  "ink",
  // ADR-0059 D2's register bands, expressed as surfaces so `Section` and
  // `Surface` are one mechanism. Measured here like the rest — they publish
  // the registers' own values, which is a different ladder from the kit's
  // gradient grounds and deserves its own check.
  "section-green",
  "section-red",
  "section-black",
] as const;

/**
 * Every custom property a surface publishes, in one theme.
 *
 * Theme-scoped blocks are read separately and layered on top, not merged
 * blindly: the high-contrast override sets the tricolour's middle step to
 * black, and a reader that flattens every matching block would report that
 * black as the value in light theme too — then fail a rule that is correct
 * while the CSS is also correct. The cascade applies the override only under
 * its own theme, and so does this.
 */
const surfaceBlock = (
  surface: string,
  theme: (typeof THEMES)[number] = "light",
): Record<string, string> => {
  const attribute = `\\[data-surface=["']${surface}["']\\]`;
  const declarations: Record<string, string> = {};

  const collect = (scoped: boolean) => {
    for (const [, selector, body] of SURFACES_CSS.matchAll(
      new RegExp(`([^{}]*${attribute}[^{]*)\\{([^}]*)\\}`, "g"),
    )) {
      const themed = selector.includes("[data-theme=");
      if (themed !== scoped) continue;
      if (themed && !selector.includes(`[data-theme="${theme}"]`)) continue;
      for (const [, name, value] of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
        declarations[name] = value.trim();
      }
    }
  };

  collect(false);
  collect(true);
  return declarations;
};

/** Resolves `var(--x)` chains against a theme's tokens until a literal falls out. */
const resolveVar = (value: string, tokens: Record<string, string>): string => {
  let current = value.trim();
  for (let hop = 0; hop < 10; hop += 1) {
    const match = current.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)$/);
    if (!match) return current;
    const next = tokens[match[1]];
    if (next === undefined) return current;
    current = next.trim();
  }
  throw new Error(`var() chain did not terminate: ${value}`);
};

const ON_SURFACE = [
  "--surface-text",
  "--surface-text-muted",
  "--surface-link",
  "--surface-icon",
  "--surface-border",
  "--surface-focus-ring",
  "--surface-tricolor-mid",
] as const;

describe.each(SURFACES)("surface %s", (surface) => {
  const block = surfaceBlock(surface);

  it("publishes the whole on-surface set", () => {
    // A missing member does not fail loudly at runtime — it inherits the
    // enclosing surface's value, so a component on brand-red quietly draws
    // the canvas's ink. Every surface declares every member.
    for (const name of ON_SURFACE) {
      expect(block[name], `${surface} is missing ${name}`).toBeDefined();
    }
  });
});

/**
 * ADR-0098 §8.2 — one text tier on the two gradient surfaces, and it is white.
 *
 * The gradients start at the identity values the guide publishes: `#00843D`
 * and `#C8102E`. White text on `green.500` measures 4.81:1 — AA for normal
 * text with 0.31 to spare, which is one tier's worth of headroom and no more.
 * ADR-0059 §D2 chose `green.700` for the flat register for exactly this
 * reason; the owner's decision keeps the official colour and gives up the
 * second tier instead. Hierarchy on these two surfaces is size and weight.
 *
 * Delete this block and a muted tier can be added back by a one-line CSS
 * change, look plausible in review on the dark end of the gradient, and fail
 * at the light end where nobody screenshots.
 */
/**
 * High contrast is exempt, and not by exception-hunting: that theme flattens
 * both gradients to a white ground with black ink, exactly as it already
 * flattens `color.section.green`/`red` (ADR-0059). A reader who has asked for
 * maximum contrast is asking the identity to stop competing with legibility,
 * so there is no gradient left there for a lightest stop to belong to. The
 * flattened values get their own assertion at the bottom of this block rather
 * than being skipped.
 */
const GRADIENT_THEMES = ["light", "dark"] as const;

describe.each(["brand-green", "brand-red"] as const)("%s carries white text only", (surface) => {
  const block = surfaceBlock(surface);

  it.each(["--surface-text", "--surface-text-muted"] as const)(
    "resolves %s to pure white wherever the gradient is drawn",
    (name) => {
      for (const theme of GRADIENT_THEMES) {
        const value = surfaceBlock(surface, theme)[name];
        const resolved = resolveVar(value, themeTokens(theme)).toUpperCase();
        expect(resolved, `${surface} ${name} in ${theme}`).toBe("#FFFFFF");
      }
    },
  );

  it("flattens to one ground with AA ink in high contrast", () => {
    const tokens = themeTokens("high-contrast");
    const hc = surfaceBlock(surface, "high-contrast");
    const from = resolveVar(hc["--surface-gradient-from"], tokens);
    const to = resolveVar(hc["--surface-gradient-to"], tokens);
    expect(from, "high contrast draws no ramp").toBe(to);

    for (const name of ["--surface-text", "--surface-text-muted"] as const) {
      const ink = resolveVar(hc[name], tokens);
      expect(contrastRatio(ink, from), `${surface} ${name} in high contrast`).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    }
  });

  it("uses no translucent or grey ink anywhere in the block", () => {
    // Opacity is the way a muted tier gets reintroduced without naming a
    // colour: `color-mix`, `rgb(… / .7)` and a bare alpha hex all read as
    // "slightly quieter white" in review and all lower the measured ratio
    // below the 0.31 of headroom the surface has.
    for (const [name, value] of Object.entries(block)) {
      if (!name.startsWith("--surface-text") && !name.startsWith("--surface-icon")) continue;
      expect(value, `${surface} ${name}`).not.toMatch(/color-mix|rgba?\(|hsla?\(|\/\s*0?\.\d/);
      expect(value, `${surface} ${name}`).not.toMatch(/^#[0-9a-fA-F]{8}$/);
    }
  });

  it("carries that white at AA on the gradient's lightest stop", () => {
    // A gradient's contrast is its lightest point, so the start stop is the
    // one that has to pass. Measured rather than asserted: if the start stop
    // is ever moved, this reports the new number.
    const lightest = resolveVar(block["--surface-gradient-from"], themeTokens("light"));
    expect(lightest).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(contrastRatio("#FFFFFF", lightest)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("keeps a perceivable border and focus ring on the lightest stop", () => {
    const lightest = resolveVar(block["--surface-gradient-from"], themeTokens("light"));
    for (const name of ["--surface-border", "--surface-focus-ring"] as const) {
      const ink = resolveVar(block[name], themeTokens("light"));
      expect(
        contrastRatio(ink, lightest),
        `${surface} ${name} on ${lightest}`,
      ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    }
  });
});

/**
 * ADR-0098 §8.4 — `surface-ink` is fixed across themes, so it needs an edge.
 *
 * ADR-0059 §D2 varied the black register by theme because pure black has no
 * boundary against a near-black page. The owner's decision fixes this surface
 * at `#0B0B0B` instead, which measures 1.06:1 against the dark page ground —
 * so the section does not stop being a section by accident, the boundary has
 * to come from something that is not the surface value.
 */
describe("surface ink", () => {
  const block = surfaceBlock("ink");

  it("is the same value in all three themes", () => {
    const values = THEMES.map((theme) =>
      resolveVar(surfaceBlock("ink", theme)["--surface-bg"], themeTokens(theme)),
    );
    expect(new Set(values).size, `ink resolved to ${values.join(", ")}`).toBe(1);
  });

  it("measures under the 1.4:1 section floor against the dark page — the reason the edge is mandatory", () => {
    // Not a threshold to pass. A measurement, recorded here so that if the
    // value is ever changed to one that does separate, the edge requirement
    // can be revisited on evidence instead of remembered as folklore.
    const ink = resolveVar(surfaceBlock("ink", "dark")["--surface-bg"], themeTokens("dark"));
    const darkPage = themeTokens("dark")["--color-surface-base"];
    expect(contrastRatio(ink, darkPage)).toBeLessThan(1.4);
  });

  it("carries body text and a border at AA against itself", () => {
    const ink = resolveVar(block["--surface-bg"], themeTokens("light"));
    expect(
      contrastRatio(resolveVar(block["--surface-text"], themeTokens("light")), ink),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(
      contrastRatio(resolveVar(block["--surface-text-muted"], themeTokens("light")), ink),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(
      contrastRatio(resolveVar(block["--surface-border"], themeTokens("light")), ink),
    ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
  });
});

/**
 * The tricolour's middle step follows the ground, which is the whole reason
 * it is a token and not a constant.
 *
 * Black in the middle disappears on ink and in dark theme; white in the
 * middle disappears on canvas in light theme. Either failure looks like a
 * two-stop gradient — green to red, which ADR-0098 D3 prohibits outright
 * because at 1.15:1 the pair has no boundary and blends through a brown that
 * is in no part of the identity.
 */
describe("tricolour middle step", () => {
  it.each(SURFACES)("separates green from red on %s", (surface) => {
    for (const theme of THEMES) {
      const tokens = themeTokens(theme);
      const mid = resolveVar(surfaceBlock(surface, theme)["--surface-tricolor-mid"], tokens);
      if (!/^#[0-9a-fA-F]{6}$/.test(mid)) continue;

      const green = tokens["--color-brand-primary"];
      const red = tokens["--color-brand-secondary"];
      // The middle step has to be visibly different from both neighbours, or
      // it is not separating anything. 1.4:1 is ADR-0059 §D2's own floor for
      // "this is a different region", reused here for "this is a different
      // stop" — the same question at a smaller scale.
      expect(contrastRatio(mid, green), `${surface}/${theme} mid vs green`).toBeGreaterThanOrEqual(1.4);
      expect(contrastRatio(mid, red), `${surface}/${theme} mid vs red`).toBeGreaterThanOrEqual(1.4);
    }
  });

  it.each(SURFACES)("is itself perceivable against the %s ground", (surface) => {
    // The general form of the rule the next test states by enumeration: a
    // middle step that vanishes into its own ground leaves a two-stop ramp,
    // which is the green-to-red blend D3 prohibits. Checked as non-text
    // contrast (WCAG 1.4.11) because the step is a mark, not text.
    //
    // Only solid grounds are measurable here; the two gradients are checked
    // against their lightest stop, which is where a light mid step would be
    // hardest to see.
    for (const theme of THEMES) {
      const tokens = themeTokens(theme);
      const block = surfaceBlock(surface, theme);
      const mid = resolveVar(block["--surface-tricolor-mid"], tokens);
      const ground = resolveVar(block["--surface-gradient-from"], tokens);
      if (!/^#[0-9a-fA-F]{6}$/.test(mid) || !/^#[0-9a-fA-F]{6}$/.test(ground)) continue;

      expect(
        contrastRatio(mid, ground),
        `${surface}/${theme}: middle step ${mid} on ground ${ground}`,
      ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    }
  });

  it("is white wherever the ground is dark, and never black there", () => {
    // Guide §6.1: on a coloured ground the mark is monochrome. On the two
    // brand surfaces every tricolour element collapses to white, so a
    // "middle step" there is white by construction.
    for (const surface of ["ink", "brand-green", "brand-red"] as const) {
      const mid = resolveVar(surfaceBlock(surface)["--surface-tricolor-mid"], themeTokens("light"));
      expect(mid.toUpperCase(), `${surface} middle step`).toBe("#FFFFFF");
    }
  });
});

/**
 * A build-tool constraint, guarded because it fails silently.
 *
 * Lightning CSS — the engine behind Tailwind v4 — **deletes** a declaration of
 * the form `--x: conic-gradient(...)`. Not a warning, not a mangled value: the
 * declaration is absent from the served stylesheet, `var(--x)` resolves to
 * nothing, the `background-image` that used it becomes invalid, and the
 * element renders at the right size, in the right place, painted with nothing.
 * A `linear-gradient` in the same position survives, which is exactly what
 * makes this easy to walk past in review.
 *
 * Measured in a real browser on 2026-09-24 against the running dev server:
 * three `conic-gradient` declarations in the source, zero in the CSS the
 * browser received. Written directly into `background-image` — including
 * `from var(--brand-border-angle)` — the same gradient survives untouched.
 *
 * So the rule is: conic gradients go in a real property, never in a custom
 * property. This reads the package's own stylesheets for the pattern.
 */
describe("no conic gradient hides inside a custom property", () => {
  const BRAND_UI = join(TOKENS_ROOT, "..", "brand-ui");

  // Every stylesheet the package ships. `surface/surface.css` is deliberately
  // absent: it held only prose once the blanket child rule was removed, and
  // an imported file with no rules is a file nobody will ever update.
  const stylesheets = ["accent/accent.css", "controls/controls.css", "content/content.css"];

  it.each(stylesheets)("%s declares no conic gradient in a custom property", (file) => {
    const source = readFileSync(join(BRAND_UI, file), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    const offenders = [...source.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*conic-gradient/g)].map(
      ([, name]) => name,
    );
    expect(offenders, `${file} would lose these declarations silently`).toEqual([]);
  });

  it("still uses a conic gradient somewhere, so the rule above is not vacuous", () => {
    // In a real property — `background` on the band's pseudo-element — which is
    // the form that survives the build.
    const accent = readFileSync(join(BRAND_UI, "accent", "accent.css"), "utf-8");
    expect(accent).toMatch(/background:\s*conic-gradient/);
  });
});
