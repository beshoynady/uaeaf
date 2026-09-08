import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * This exists as real, tested code rather than a number typed into a comment
 * because the project has already been bitten twice by contrast asserted from
 * memory: `color.text.muted` carries the comment "4.68:1 on white" — correct,
 * and the only ground anyone ever checked. On `surface.sunken` it is 4.48:1,
 * and on all three dark-theme surfaces it is 4.00 / 3.48 / 4.49. A claim in a
 * comment cannot fail a build; a function can.
 */
describe("relativeLuminance", () => {
  it.each([
    ["#FFFFFF", 1],
    ["#000000", 0],
  ])("anchors %s at %d", (hex, expected) => {
    expect(relativeLuminance(hex)).toBeCloseTo(expected, 10);
  });

  it("applies the sRGB linearisation, not a naive average", () => {
    // Mid-grey #808080 is 0.5 in sRGB but ~0.2159 in linear light. A naive
    // implementation returns ~0.5 and silently overstates every dark pairing.
    expect(relativeLuminance("#808080")).toBeCloseTo(0.2158, 3);
  });

  it("weights the channels per Rec. 709, so green outweighs blue", () => {
    expect(relativeLuminance("#00FF00")).toBeGreaterThan(relativeLuminance("#0000FF"));
    expect(relativeLuminance("#00FF00")).toBeCloseTo(0.7152, 4);
  });

  it("accepts lowercase and a missing hash", () => {
    expect(relativeLuminance("ffffff")).toBe(relativeLuminance("#FFFFFF"));
  });
});

describe("contrastRatio", () => {
  it("gives 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 6);
  });

  it("is symmetric — order of the pair does not matter", () => {
    expect(contrastRatio("#00843D", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#00843D"));
  });

  it("gives 1:1 for a colour against itself", () => {
    expect(contrastRatio("#C8102E", "#C8102E")).toBeCloseTo(1, 6);
  });

  it("reproduces Chapter 1's published figure for Federation Red", () => {
    // Chapter 1 §Accessibility Considerations: "Red 500 on white = 5.9:1".
    expect(contrastRatio("#C8102E", "#FFFFFF").toFixed(1)).toBe("5.9");
  });

  it("contradicts Chapter 1's published figure for Federation Green", () => {
    // Chapter 1 §Accessibility Considerations states "Green 500 on white =
    // 4.6:1". The true value for #00843D is 4.81:1. Pinning it here rather
    // than quietly matching the document: the doc figure is the one that is
    // wrong, and it errs *pessimistically* (it under-reports headroom), so it
    // has never caused a failure — but a future reader deriving a decision
    // from 4.6 would be working from a number this codebase can disprove.
    //
    // Corrected in `00-01-Introduction-BrandIdentity.md` §Accessibility
    // Considerations; this test is what keeps the two in step.
    expect(contrastRatio("#00843D", "#FFFFFF").toFixed(2)).toBe("4.81");
    expect(contrastRatio("#00843D", "#FFFFFF")).not.toBeCloseTo(4.6, 1);
  });
});
