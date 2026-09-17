/**
 * The homepage hero's decisions that are not rendering: which way a gesture
 * moves, and the timing and geometry of the transition. Which picture a reader
 * sees lives in `@uaeaf/content/hero` (`resolveImage`), shared with the
 * dashboard's preview (ADR-0083). Kept pure so the owner's numbers (at most 1.2s; the words never
 * gone for more than ~200ms; the new words only once the picture has settled)
 * are asserted rather than trusted.
 */

/**
 * The transition is the lanes (owner decision 2026-09-17, ADR-0076 D8.3): the
 * next picture runs in on six horizontal lanes, one after the other in the
 * reading direction, like athletes coming off a bend. The current words leave
 * quickly just before the picture settles, and the new ones rise right after it.
 * Reduced motion swaps the slides at once.
 */

const WORDS = {
  textOut: { startS: 0.6, durationS: 0.2, staggerTotalS: 0.05 },
  textIn: { startS: 0.9, durationS: 0.24, staggerTotalS: 0.06 },
} as const;

export const HERO_TIMING = {
  /** A slide's whole time on screen, transition included (owner decision
   *  2026-09-16), leaving more than five seconds to read. */
  dwellMs: 7000,
  lanes: {
    image: { durationS: 0.6, settleS: 0.85, laneStepS: 0.05 },
    ...WORDS,
  },
  /** A step the reader asked for answers faster than one that arrives. */
  manualFactor: 0.6,
  /** How far the camera moves in over the dwell: less on a phone, where the
   *  frame is already a tight crop of the picture. */
  kenBurns: { desktop: 1.06, mobile: 1.03 },
  /** The longest a transition waits for the next picture to decode before an
   *  automatic step is put off and a manual one proceeds anyway. */
  decodeTimeoutMs: 3000,
} as const;

/** A transition, end to end. Rounded to the millisecond: summed binary
 *  fractions otherwise report 1.2000000000000002 for a 1.2s transition. */
export const transitionSeconds = (): number => {
  const { image, textOut, textIn } = HERO_TIMING.lanes;
  return (
    Math.round(
      1000 *
        Math.max(
          image.settleS,
          textOut.startS + textOut.durationS + textOut.staggerTotalS,
          textIn.startS + textIn.durationS + textIn.staggerTotalS,
        ),
    ) / 1000
  );
};

export const LANE_COUNT = 6;

/**
 * One lane's still band of the frame, in pixels of a frame `height` tall.
 * Adjacent bands meet on the same boundary and each reaches half a pixel past
 * it, so no background line can show between two lanes whatever the frame's
 * height rounds to.
 *
 * A still band that clips (`overflow: hidden`) with the picture moving inside
 * it by `transform`, rather than a `clip-path` on the moving strip: the
 * compositor can run the first, the second repaints every frame. Measured with a
 * GPU on the production build (2026-09-17), the clip-path lanes held a mean of
 * 41.3fps at 1440.
 */
export const laneBand = (lane: number, height: number): { top: number; height: number } => {
  const top = (lane * height) / LANE_COUNT - (lane > 0 ? 0.5 : 0);
  const bottom = ((lane + 1) * height) / LANE_COUNT + (lane < LANE_COUNT - 1 ? 0.5 : 0);
  return { top, height: bottom - top };
};

/** Where a lane starts: wholly off the frame on the side the line starts from. */
export const laneStart = (dir: Direction): string => (dir === "rtl" ? "translateX(100%)" : "translateX(-100%)");

/** Top lane first. */
export const laneDelay = (lane: number): number => lane * HERO_TIMING.lanes.image.laneStepS;

export type Direction = "rtl" | "ltr";

/** Below this a horizontal movement is a tap or a tremor, not a swipe. */
const SWIPE_THRESHOLD = 48;

/**
 * A finished horizontal gesture as a step: 1 forward, -1 back, 0 none.
 *
 * Forward is the reading direction. In Arabic the next slide comes from the
 * left, so pulling the content rightwards brings it in; in English the reverse.
 * A gesture more vertical than horizontal belongs to the page's scroll.
 */
export const navigationFromSwipe = (dx: number, dy: number, dir: Direction): -1 | 0 | 1 => {
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return 0;
  const forward = dir === "rtl" ? dx > 0 : dx < 0;
  return forward ? 1 : -1;
};

/** The arrow keys, in the same sense: the arrow that points the way the line
 *  reads moves forward. */
export const navigationFromKey = (key: string, dir: Direction): -1 | 0 | 1 => {
  if (key === "ArrowLeft") return dir === "rtl" ? 1 : -1;
  if (key === "ArrowRight") return dir === "rtl" ? -1 : 1;
  return 0;
};
