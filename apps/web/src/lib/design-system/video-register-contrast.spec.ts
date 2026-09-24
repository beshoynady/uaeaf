import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AA_LARGE_TEXT_OR_NON_TEXT, AA_NORMAL_TEXT, contrastRatio } from "@uaeaf/design-tokens/testing";

/**
 * The video system's dark register, measured.
 *
 * The owner took this system out of the design system's colour rules
 * (2026-09-23), so none of these values is a token and none of them is checked
 * by `register-contrast.spec.ts`. That grant is about which colours may be
 * used, not about whether they are legible: WCAG 2.1 AA still applies, and the
 * brief states the ratios must be computed rather than assumed.
 *
 * So this reads the values out of `video-system.css` itself rather than
 * restating them. A colour edited in the stylesheet is measured here on the
 * next run; a colour restated in a test is a number that agrees with the
 * stylesheet only until someone changes one of them.
 */

const CSS = readFileSync(join(__dirname, "../../styles/video-system.css"), "utf8");

/** One `--vs-*` value from the `.video-system` block. */
const value = (name: string): string => {
  const match = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`video-system.css declares no --${name}`);
  return match[1].trim();
};

const C = {
  bg: value("vs-bg"),
  surface: value("vs-surface"),
  surfaceRaised: value("vs-surface-raised"),
  text: value("vs-text"),
  textSecondary: value("vs-text-secondary"),
  textMuted: value("vs-text-muted"),
  green: value("vs-green"),
  onGreen: value("vs-on-green"),
  live: value("vs-live"),
  liveInk: value("vs-live-ink"),
};

/**
 * The hairline is `rgba(255,255,255,0.09)` and so has no ratio of its own: it
 * is a translucent white composited onto whichever ground it sits on. It is
 * measured as its composite, in channel space — blending luminances instead
 * of channels reports a different (and wrong) number, which this project has
 * already been caught by once.
 */
const over = (ground: string, white: number): string => {
  const g = ground.replace("#", "");
  const mix = (offset: number) => {
    const base = parseInt(g.slice(offset, offset + 2), 16);
    return Math.round(base * (1 - white) + 255 * white);
  };
  return `#${[0, 2, 4].map((o) => mix(o).toString(16).padStart(2, "0")).join("")}`;
};

const HAIRLINE_ALPHA = 0.09;

interface Pair {
  what: string;
  fg: string;
  bg: string;
  /** Normal text, or large text / a non-text boundary. */
  floor: number;
}

const PAIRS: Pair[] = [
  { what: "body text on the page ground", fg: C.text, bg: C.bg, floor: AA_NORMAL_TEXT },
  { what: "body text on a card", fg: C.text, bg: C.surface, floor: AA_NORMAL_TEXT },
  { what: "body text on a raised control", fg: C.text, bg: C.surfaceRaised, floor: AA_NORMAL_TEXT },
  { what: "secondary text on the page ground", fg: C.textSecondary, bg: C.bg, floor: AA_NORMAL_TEXT },
  { what: "secondary text on a card", fg: C.textSecondary, bg: C.surface, floor: AA_NORMAL_TEXT },
  { what: "secondary text on a raised control", fg: C.textSecondary, bg: C.surfaceRaised, floor: AA_NORMAL_TEXT },
  { what: "muted meta on the page ground", fg: C.textMuted, bg: C.bg, floor: AA_NORMAL_TEXT },
  { what: "muted meta on a card", fg: C.textMuted, bg: C.surface, floor: AA_NORMAL_TEXT },
  { what: "green category label on the page ground", fg: C.green, bg: C.bg, floor: AA_NORMAL_TEXT },
  { what: "green category label on a card", fg: C.green, bg: C.surface, floor: AA_NORMAL_TEXT },
  { what: "ink on the green button", fg: C.onGreen, bg: C.green, floor: AA_NORMAL_TEXT },
  { what: "ink on the live badge", fg: C.liveInk, bg: C.live, floor: AA_NORMAL_TEXT },
  // The focus ring and the live frame are boundaries, not text: §1.4.11.
  { what: "green focus ring against the page ground", fg: C.green, bg: C.bg, floor: AA_LARGE_TEXT_OR_NON_TEXT },
  { what: "live frame against the page ground", fg: C.live, bg: C.bg, floor: AA_LARGE_TEXT_OR_NON_TEXT },
  { what: "hairline on the page ground", fg: over(C.bg, HAIRLINE_ALPHA), bg: C.bg, floor: 1 },
  { what: "hairline on a card", fg: over(C.surface, HAIRLINE_ALPHA), bg: C.surface, floor: 1 },
];

describe("the video system's dark register", () => {
  it.each(PAIRS)("$what clears $floor:1", ({ fg, bg, floor }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(floor);
  });

  /**
   * The hairline is decoration, not a boundary a reader must find: a card's
   * edge is its own surface against the page, and the 1px line only refines
   * it. So it has no §1.4.11 floor. It is measured anyway, and asserted to be
   * VISIBLE at all, because a hairline nobody can see is a line that should be
   * deleted rather than kept at a value that does nothing.
   */
  it("draws a hairline that is actually visible on both grounds", () => {
    expect(contrastRatio(over(C.bg, HAIRLINE_ALPHA), C.bg)).toBeGreaterThan(1.1);
    expect(contrastRatio(over(C.surface, HAIRLINE_ALPHA), C.surface)).toBeGreaterThan(1.1);
  });

  /**
   * The one pair the design gets wrong if nobody checks it: the live red is a
   * fine boundary against the ground, but white-on-red is only just a pass and
   * red-on-dark as TEXT is not. The badge therefore puts white ink on a red
   * fill and never red text on the dark ground, and this is what holds that.
   */
  it("keeps the live red as a fill and a frame, never as text on the ground", () => {
    expect(contrastRatio(C.live, C.bg)).toBeLessThan(AA_NORMAL_TEXT);
    expect(contrastRatio(C.liveInk, C.live)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  /** Printed so the report's contrast table is generated rather than typed. */
  it("prints the measured table", () => {
    const rows = PAIRS.map(({ what, fg, bg, floor }) => ({
      pair: what,
      foreground: fg,
      background: bg,
      ratio: `${contrastRatio(fg, bg).toFixed(2)}:1`,
      floor: `${floor}:1`,
    }));
    // eslint-disable-next-line no-console -- the table IS the deliverable here.
    console.table(rows);
    expect(rows).toHaveLength(PAIRS.length);
  });
});
