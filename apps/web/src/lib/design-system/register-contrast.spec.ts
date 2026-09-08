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
 * The rule this exists to enforce is the owner's, stated in as many words:
 * contrast is checked "on every surface the element may sit on, not white
 * alone". That instruction came from a failure — `color.text.muted` shipped
 * with a comment reading "4.68:1 on white", which was true, and white was the
 * only ground anyone had checked; the same token measured 4.48 on the sunken
 * surface and 4.00 / 3.48 / 4.49 on the three dark ones.
 *
 * Coloured registers multiply that risk, because a register is a whole extra
 * ground that no existing check knew about. So every tier of every register
 * is measured here rather than asserted anywhere.
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
