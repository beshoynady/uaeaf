"use client";

import { useRef, useSyncExternalStore } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

type Direction = "ltr" | "rtl";

/**
 * The handover at a seam (ADR-0087 D8, adopting Chapter 27 §34 within limits):
 * as a coloured band enters the view, its colour is carried across its own top
 * padding behind the identity's 45° edge, in the reading direction.
 *
 * ── A cover, and why not a fill ───────────────────────────────────────────
 *
 * What moves is a cover in the colour of the ground above, lying over the
 * band's top padding and sliding off it. The other way round, a strip of the
 * band's colour sliding in, would leave a painted layer on the band for good,
 * and a layer that is always there can show a hairline along its edge at some
 * width on some screen. At rest the cover is wholly outside the strip and
 * clipped away, so the band is drawn by exactly the pixels it always was.
 *
 * ── Rest is where the layout puts it ──────────────────────────────────────
 *
 * The cover is laid out beside the strip, off its end (`start-full`), so with
 * no transform at all it is out of sight. Every way of not running the
 * handover is therefore the band as it always was: without JavaScript, for a
 * reader who asked for less motion, in a browser that fails somewhere in here.
 * The server never writes a transform, so it cannot send the covered state.
 *
 * Scrolling pulls the cover back over the strip by a share of its own width
 * (see `coverOffset`), and rest is the value `0%`, on purpose: Motion writes
 * no transform for a value that is its default, so a rest expressed as any
 * other number would fall back to the stylesheet at exactly that moment and
 * jump. Measured 2026-09-18, when the cover was resting at `100%` and read as
 * gone at the one moment it should have covered.
 *
 * ── Tied to the scroll, not to an event ───────────────────────────────────
 *
 * The cover's place is a function of where the seam stands on the screen
 * (`useScroll`, so every supported browser sees it: scroll-driven CSS is not
 * Baseline and Firefox has none). A reader who arrives past the seam, by a
 * restored scroll, an in-page link or a browser Find, gets a cover already
 * gone, because nothing here waits for an edge to be crossed.
 *
 * `transform` only, on an element out of the flow: no layout moves (ADR-0009,
 * Chapter 5 §5.9). The shape is a static `clip-path`; it is never animated.
 */

/**
 * How far the cover is pulled back over the strip, as a share of its own
 * width, against the direction it leaves in.
 *
 * - `0%`: at rest, off the strip. Where the seam is once it has come in.
 * - `-100%` (`100%` in Arabic): lying over the strip. Where the seam is while
 *   it is still at the foot of the screen.
 *
 * `progress` runs from 0 as the strip's top meets the foot of the screen to 1
 * as it meets the top, so `progress × viewport` is how far the seam has come
 * in, in pixels; the cover is gone after `distance` of them. A distance that
 * cannot be read means the cover is gone: not knowing is never a reason to
 * cover a band.
 */
export const coverOffset = (progress: number, viewport: number, distance: number, direction: Direction): string => {
  const gone = distance > 0 ? Math.min(1, Math.max(0, (progress * viewport) / distance)) : 1;
  return `${(direction === "rtl" ? 100 : -100) * (1 - gone)}%`;
};

/** The length the handover runs over: `--space-32`, the length ADR-0067 D4
 *  fixed for a section's entrance, read from the stylesheet so it is never a
 *  number written here.
 *
 *  Read once and kept. It is a token, so it does not change while the page is
 *  open, and asking the browser for a computed style on every scroll frame is
 *  work with nothing to show for it. That is the whole reason: no cost was
 *  measured either way (an A/B against `UAEAF_MOTION_OFF=seam`, alternating,
 *  in Firefox, 2026-09-20, gave the same frame times through the seam and
 *  away from it). A read that finds nothing yet is not kept, so the next frame
 *  asks again. */
let distance = 0;
const readDistance = (): number => {
  if (!(distance > 0)) distance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-32"));
  return distance;
};

/** Nothing to subscribe to: the only fact read is whether this is the browser. */
const never = () => () => {};

export const SeamHandover = ({ direction }: { direction: Direction }) => {
  const strip = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // False on the server and while hydrating, true from then on, with no state
  // and no effect. Armed only in the browser and only with motion allowed;
  // until then the cover takes no inline transform and rests where it is laid
  // out, which is off the strip.
  const inBrowser = useSyncExternalStore(never, () => true, () => false);
  const armed = inBrowser && !reduced;
  const { scrollYProgress } = useScroll({ target: strip, offset: ["start end", "start start"] });
  // The library runs this while rendering, on the server as well, where there
  // is no window to read. The answer there is rest, which is also the only
  // thing the server may say: the value is never drawn until the browser has
  // armed it.
  const x = useTransform(scrollYProgress, (progress) =>
    typeof window === "undefined" ? "0%" : coverOffset(progress, window.innerHeight, readDistance(), direction),
  );

  return (
    <div
      ref={strip}
      aria-hidden="true"
      data-seam-handover=""
      // As tall as the band's own top padding, so the cover never reaches the
      // band's content. `--seam-h` follows that padding breakpoint for
      // breakpoint and is declared once, in `motion.css`.
      className="seam-handover pointer-events-none absolute inset-x-0 top-0 h-[var(--seam-h)] overflow-clip"
    >
      <m.div
        // Beside the strip, off its end, and `--seam-h` wider than it: the
        // extra is where the 45° cut stands when the cover lies over the strip.
        className="seam-cover absolute inset-y-0 start-full w-[calc(100%+var(--seam-h))] bg-[color:var(--color-surface-base)]"
        style={armed ? { x } : undefined}
      />
    </div>
  );
};
