import { describe, expect, it } from "vitest";
import {
  AA_LARGE_TEXT_OR_NON_TEXT,
  AA_NORMAL_TEXT,
  contrastRatio,
  themeTokens,
} from "@uaeaf/design-tokens/testing";

/**
 * The coloured registers, measured on every ground, in every theme.
 *
 * Contrast is checked on every surface an element may sit on, never on white
 * alone: a register is an extra ground that no surface-level check knows
 * about, so every tier of every register is measured here rather than asserted
 * anywhere.
 */
const THEMES = ["light", "dark", "high-contrast"] as const;
const REGISTERS = ["green", "red", "black"] as const;

describe.each(THEMES)("registers in %s theme", (theme) => {
  const tokens = themeTokens(theme);

  describe.each(REGISTERS)("%s", (register) => {
    const surface = tokens[`--color-section-${register}-surface`];
    const text = tokens[`--color-section-${register}-text`];
    const muted = tokens[`--color-section-${register}-text-muted`];
    const border = tokens[`--color-section-${register}-border`];

    it("declares a complete set", () => {
      for (const [name, value] of Object.entries({ surface, text, muted, border })) {
        expect(value, `${register}.${name} is undefined in ${theme}`).toBeDefined();
      }
    });

    it("carries body text at AA", () => {
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("carries a second text tier at AA — the reason the surface is the 600/700 step", () => {
      // ADR-0059 §D2 chose `green.700` over `green.500` precisely so a muted
      // tier would fit: white on `green.500` is 4.81:1, which passes for one
      // tier and leaves nothing underneath it.
      expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("carries a border at non-text AA", () => {
      // WCAG §1.4.11. A card edge on a coloured band is a boundary that has
      // to be perceivable, not decoration.
      expect(contrastRatio(border, surface)).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    });

    it("shows a focus indicator against this ground", () => {
      // The indicator is two bands — a painted offset next to the control,
      // then the ring outside it — and the pair always spans black to white.
      // Either band clearing §1.4.11 against the ground is enough for the
      // indicator to be perceivable, because the two are adjacent to each
      // other and one of them is always the opposite extreme.
      //
      // Checking only the offset was the first version of this rule, and it
      // failed on all three registers in dark theme: the offset is `#000000`
      // there, 2.23:1 on the green ground. The ring is `#FFFFFF` in that
      // theme and clears it easily, so the indicator was fine and the rule
      // was wrong. Recorded rather than quietly relaxed.
      //
      // This is what makes one focus treatment valid on all four registers
      // instead of needing a per-register variant.
      const best = Math.max(
        contrastRatio(tokens["--a11y-focus-offset"], surface),
        contrastRatio(tokens["--a11y-focus-ring"], surface),
      );
      expect(best).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    });

    it("departs from the page it sits on", () => {
      // A register exists to read as a different region. ADR-0059 §D2 set
      // 1.4:1 as the floor and used it to reject `neutral-warm.800` for the
      // dark black register at 1.46 — kept, but only just — and pure black at
      // 1.12, which has no boundary at all.
      //
      // High-contrast is exempt by design, not by exception-hunting: that
      // theme deliberately flattens green and red to black-on-white
      // (ADR-0059), because a reader who has asked for maximum contrast is
      // asking for the identity to stop competing with legibility. Colour is
      // not the channel there, so "departs from the page" is not the goal.
      if (theme === "high-contrast") return;

      const page = tokens["--color-surface-base"];
      expect(contrastRatio(surface, page)).toBeGreaterThanOrEqual(1.4);
    });
  });

  it("proves why the green/red separator is mandatory", () => {
    // Not a threshold — a measurement. If this ever rises above 1.4:1 the
    // separator rule could be revisited; while it sits here, two adjacent
    // bands are one band, and `SectionStack` inserts the separator for you.
    const green = tokens["--color-section-green-surface"];
    const red = tokens["--color-section-red-surface"];
    const measured = contrastRatio(green, red);

    if (theme === "high-contrast") {
      // The high-contrast theme deliberately flattens the registers to
      // black-on-white, so there is no green/red adjacency left to separate.
      expect(measured).toBeGreaterThanOrEqual(1);
      return;
    }

    expect(measured).toBeLessThan(1.4);
    expect(tokens["--color-section-adjacent-separator"]).toBeDefined();
  });
});

/**
 * The page's own text ladder, measured on every page surface.
 *
 * Without this block nothing compares a `--color-text-*` token to a
 * `--color-surface-*` one, which is how the link token kept an "AA on dark
 * surface" comment that measurement contradicted — 4.17:1 on the dark card
 * (ADR-0063 D1).
 *
 * `text.disabled` is excluded, not overlooked: WCAG 1.4.3 exempts inactive
 * components and the dimming is the affordance.
 */const PAGE_TEXT = ["primary", "secondary", "muted", "link"] as const;
const PAGE_SURFACES = ["base", "raised", "sunken"] as const;

describe.each(THEMES)("page text ladder in %s theme", (theme) => {
  const tokens = themeTokens(theme);

  describe.each(PAGE_TEXT)("text.%s", (tier) => {
    const color = tokens[`--color-text-${tier}`];

    it("is declared", () => {
      expect(color, `--color-text-${tier}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it.each(PAGE_SURFACES)("clears AA on surface.%s", (name) => {
      const surface = tokens[`--color-surface-${name}`];
      expect(
        contrastRatio(color, surface),
        `--color-text-${tier} on --color-surface-${name}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  });

  it("keeps the link distinguishable from body text, not only legible", () => {
    // Not the accessibility floor — WCAG 1.4.1 is satisfied by the underline.
    // This is the reason a link token exists at all: one that resolves to the
    // paragraph colour around it is doing no work.
    //
    // High-contrast inverts that deliberately, per its own token file: there
    // the underline carries the link cue and colour stops competing with
    // legibility, so link and body text are the same black.
    if (theme === "high-contrast") {
      expect(tokens["--color-text-link"]).toBe(tokens["--color-text-primary"]);
      return;
    }

    expect(tokens["--color-text-link"]).not.toBe(tokens["--color-text-primary"]);
  });
});
