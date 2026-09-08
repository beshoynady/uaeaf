/**
 * WCAG 2.1 contrast maths (§1.4.3 Contrast Minimum, §1.4.11 Non-text Contrast).
 *
 * Kept as production code, not test-only, so that a contrast claim anywhere in
 * this design system is a computation rather than a remembered number. The
 * project's own history is the argument: `color.text.muted` shipped with the
 * comment "4.68:1 on white" — accurate for white, and white was the only
 * ground anyone checked. The same token measures 4.48:1 on `surface.sunken`
 * and 4.00 / 3.48 / 4.49 on the three dark-theme surfaces.
 *
 * Formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

const SRGB_THRESHOLD = 0.03928;

/** Relative luminance of an sRGB hex colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    // The low end is linear, not a power curve — using the exponent throughout
    // overstates dark colours and inflates every contrast ratio involving one.
    return value <= SRGB_THRESHOLD ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  // Rec. 709 luminance weights: the eye is far more sensitive to green.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA thresholds, named so call sites read as the rule they enforce. */
export const AA_NORMAL_TEXT = 4.5;
/** §1.4.3 large text (≥18.66px bold or ≥24px) and §1.4.11 non-text (borders, icons). */
export const AA_LARGE_TEXT_OR_NON_TEXT = 3;

function channels(hex: string): [number, number, number] {
  const raw = hex.trim().replace(/^#/, "");
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a 6-digit hex colour: "${hex}"`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
