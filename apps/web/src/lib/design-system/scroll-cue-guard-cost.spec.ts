import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The scroll cue (ADR-0079) leaves the page's animations once the reader has
 * scrolled.
 *
 * `identity-lines.spec.ts` scrubs every animation on the page, 10ms at a time,
 * to the end of the longest, and measures every stroke against every text run
 * at each step. The cue's nudge ends at 1.92s; before it, the Strategic Plan's
 * longest was the hero ground at 1.2s. Hidden with `visibility`, the cue still
 * kept its finished animation, so the measurement after the reveal, with 82
 * animations to step, ran 194 frames instead of about 122. At 360x640 in Arabic
 * (10 strokes, 124 text rectangles) that passed the test's 180s limit
 * (2026-09-17).
 *
 * Once scrolled the cue is gone for good, so its animation goes with it.
 */
const MOTION = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "styles", "motion.css");

const block = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`no rule for ${selector}`);
  return match[1];
};

describe("the scroll cue once the reader has scrolled", () => {
  const css = readFileSync(MOTION, "utf8").replace(/\r\n/g, "\n");

  it("is hidden without fading, since nothing in <main> may animate opacity", () => {
    const scrolled = block(css, ".scroll-cue[data-scrolled]");
    expect(scrolled).toMatch(/visibility\s*:\s*hidden/);
    expect(scrolled).not.toMatch(/opacity|transition/);
  });

  it("drops its animation, so the identity-lines guard no longer steps through it", () => {
    expect(block(css, ".scroll-cue[data-scrolled]")).toMatch(/animation\s*:\s*none/);
  });
});
