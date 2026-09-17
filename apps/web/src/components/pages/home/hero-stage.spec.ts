import { describe, expect, it } from "vitest";
import * as stage from "./hero-stage";
import {
  HERO_TIMING,
  LANE_COUNT,
  laneBand,
  laneDelay,
  laneStart,
  navigationFromKey,
  navigationFromSwipe,
  transitionSeconds,
} from "./hero-stage";

describe("the transition: the lanes, chosen by the owner (2026-09-17)", () => {
  it("finishes within 1.2s", () => {
    expect(transitionSeconds()).toBeLessThanOrEqual(1.2);
  });

  it("never leaves the frame without words for more than ~200ms", () => {
    const { textOut, textIn } = HERO_TIMING.lanes;
    const gone = textOut.startS + textOut.durationS + textOut.staggerTotalS;
    expect(textIn.startS - gone).toBeLessThanOrEqual(0.2);
  });

  it("brings the new words in only once the picture has settled", () => {
    const { image, textIn } = HERO_TIMING.lanes;
    expect(textIn.startS).toBeGreaterThanOrEqual(image.settleS);
  });

  it("includes the transition in the slide's dwell, leaving at least five seconds to read", () => {
    expect(HERO_TIMING.dwellMs / 1000 - transitionSeconds()).toBeGreaterThanOrEqual(5);
  });

  it("ships no other prototype and no development switch", () => {
    expect("camera" in HERO_TIMING).toBe(false);
    expect(Object.keys(stage)).not.toContain("resolveTransition");
  });
});

describe("the lanes: six horizontal strips that tile the frame exactly", () => {
  it("has six lanes", () => {
    expect(LANE_COUNT).toBe(6);
  });

  // Still bands with overflow hidden, not a clip-path on the moving strip: a
  // transform inside a still clip stays on the compositor. Measured with a GPU
  // on the production build, the clip-path lanes held 41.3fps at 1440.
  it("covers the whole height with no gap, each band overlapping its neighbour by half a pixel", () => {
    const height = 804;
    const bands = Array.from({ length: LANE_COUNT }, (_, lane) => laneBand(lane, height));
    expect(bands[0].top).toBe(0);
    expect(bands[LANE_COUNT - 1].top + bands[LANE_COUNT - 1].height).toBeCloseTo(height, 6);
    for (let lane = 0; lane < LANE_COUNT - 1; lane += 1) {
      const boundary = ((lane + 1) * height) / LANE_COUNT;
      expect(bands[lane].top + bands[lane].height).toBeCloseTo(boundary + 0.5, 6);
      expect(bands[lane + 1].top).toBeCloseTo(boundary - 0.5, 6);
    }
  });

  it("enters in the reading direction: from the right in Arabic, from the left in English", () => {
    expect(laneStart("rtl")).toBe("translateX(100%)");
    expect(laneStart("ltr")).toBe("translateX(-100%)");
  });

  it("staggers the lanes top to bottom inside the transition's budget", () => {
    const delays = Array.from({ length: LANE_COUNT }, (_, lane) => laneDelay(lane));
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays[LANE_COUNT - 1] + HERO_TIMING.lanes.image.durationS).toBeLessThanOrEqual(HERO_TIMING.lanes.image.settleS + 1e-9);
  });
});

describe("manual navigation follows the reading direction", () => {
  it.each([
    ["rtl", 80, 0, 1],
    ["rtl", -80, 0, -1],
    ["ltr", -80, 0, 1],
    ["ltr", 80, 0, -1],
  ] as const)("in %s a swipe of %ipx moves by %i", (dir, dx, dy, step) => {
    expect(navigationFromSwipe(dx, dy, dir)).toBe(step);
  });

  it("leaves a mostly vertical gesture to the page", () => {
    expect(navigationFromSwipe(60, 90, "ltr")).toBe(0);
  });

  it("ignores a movement too short to be a swipe", () => {
    expect(navigationFromSwipe(20, 0, "ltr")).toBe(0);
  });

  it.each([
    ["rtl", "ArrowLeft", 1],
    ["rtl", "ArrowRight", -1],
    ["ltr", "ArrowRight", 1],
    ["ltr", "ArrowLeft", -1],
    ["ltr", "Tab", 0],
  ] as const)("in %s %s moves by %i", (dir, key, step) => {
    expect(navigationFromKey(key, dir)).toBe(step);
  });
});
