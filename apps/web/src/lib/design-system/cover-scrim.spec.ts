import { describe, expect, it } from "vitest";
import { AA_LARGE_TEXT_OR_NON_TEXT, AA_NORMAL_TEXT, contrastRatio } from "@uaeaf/design-tokens/testing";
import { COVER_SCRIM_MIN, coverScrim, coverScrimFade } from "@uaeaf/content/hero";

/**
 * The cover story's words, measured on the picture that hurts most.
 *
 * The approved canvas draws this card as text over a photograph, and its own
 * scrim passes only because the placeholder behind it is a dark green
 * gradient. Over a light photograph the same gradient measures **1.43:1** at
 * the top of the text block — a headline nobody can read, on the most
 * prominent card of the page.
 *
 * So the floor is measured here rather than assumed, against the lightest
 * image that can physically exist. A photograph cannot be brighter than white,
 * so a wash that carries white text over white carries it over any picture an
 * editor uploads. That is the whole point of testing the impossible case: it
 * removes the photograph from the question.
 *
 * ── Why the stops are read out of the gradient ─────────────────────────────
 *
 * Re-typing the percentages here would measure this file against itself. They
 * are parsed from what `coverScrim()` actually returns, so weakening the
 * gradient fails the test instead of silently moving the number it is
 * compared against.
 */

/** The lightest ground a photograph can present. Nothing renders brighter. */
const WORST_CASE_IMAGE = "#ffffff";

/** The overlay token, in every theme (`--color-surface-overlay`). */
const OVERLAY = "#000000";

/** Every `N%` the gradient mixes the overlay at, in source order. */
const stopsOf = (gradient: string): number[] =>
  [...gradient.matchAll(/var\(--color-surface-overlay\)\s+(\d+(?:\.\d+)?)%/g)].map((match) => Number(match[1]));

/** `color-mix(in srgb, #000 N%, transparent)` over a ground: the alpha
 *  composite the browser performs, in sRGB, as a hex the ratio helper reads. */
const composite = (percent: number, ground: string): string => {
  const alpha = percent / 100;
  const channel = (offset: number) => {
    const over = parseInt(OVERLAY.slice(1 + offset * 2, 3 + offset * 2), 16);
    const under = parseInt(ground.slice(1 + offset * 2, 3 + offset * 2), 16);
    return Math.round(over * alpha + under * (1 - alpha));
  };
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, "0")).join("")}`;
};

describe("the cover story's reading wash", () => {
  const stops = stopsOf(coverScrim());

  it("mixes the overlay token rather than a colour of its own", () => {
    // A literal `rgba(8,14,10,…)` — what the canvas draws — is a fourth near
    // black beside the three the token system already defines, and it would
    // not follow the overlay token if a theme ever moved it.
    expect(coverScrim()).toContain("var(--color-surface-overlay)");
    expect(stops.length).toBeGreaterThanOrEqual(3);
  });

  it("carries white body text at every stop, over a pure white photograph", () => {
    // The excerpt and the date are ordinary text, so 4.5:1 — the strict
    // floor — applies to the whole block, not only to the headline.
    for (const stop of stops) {
      expect(contrastRatio("#ffffff", composite(stop, WORST_CASE_IMAGE))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("never lets any stop fall below the measured floor", () => {
    // The weakest stop is what a headline that wraps to three lines stands
    // on, so the floor is a property of the gradient and not of one layout.
    expect(Math.min(...stops)).toBeGreaterThanOrEqual(COVER_SCRIM_MIN);
  });

  it("holds the floor with room to spare, not by a rounding margin", () => {
    const weakest = contrastRatio("#ffffff", composite(Math.min(...stops), WORST_CASE_IMAGE));
    // 6.70:1 at 64%. The margin matters because a real photograph varies
    // across the block while this measures one flat worst case.
    expect(weakest).toBeGreaterThan(6);
  });

  it("also clears the non-text floor for the chip and icon edges over it", () => {
    expect(contrastRatio("#ffffff", composite(Math.min(...stops), WORST_CASE_IMAGE))).toBeGreaterThanOrEqual(
      AA_LARGE_TEXT_OR_NON_TEXT,
    );
  });

  it("fades to nothing above the text, and carries no text itself", () => {
    const fade = stopsOf(coverScrimFade());
    // The strip exists to soften the panel's upper edge. It reaches the same
    // floor where it meets the text and goes transparent away from it, which
    // is only safe because nothing is drawn on it.
    expect(Math.max(...fade)).toBe(COVER_SCRIM_MIN);
    expect(coverScrimFade()).toContain("transparent");
  });
});
