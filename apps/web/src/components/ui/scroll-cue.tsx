"use client";

import { useEffect, useRef } from "react";
import { IDENTITY_RIBBONS as RIBBONS } from "./identity-ribbons";

/**
 * The hint that a first-screen hero is not the whole page (owner decision
 * 2026-09-16, ADR-0079).
 *
 * ADR-0078 made every hero with a picture as tall as the screen less the
 * header, so on Vision & Mission and the Strategic Plan the start of the
 * content no longer shows on arrival. This says there is more below.
 *
 * - The mark is the logo's first two strokes, red then green, at the logo's
 *   45° ascent and never mirrored (ADR-0059 D7.1), above a plain chevron.
 * - It stands on its own `--color-surface-overlay` disc, black in every theme,
 *   so its contrast does not depend on the photograph behind it: red 3.57:1 and
 *   green 4.37:1 against that black, white 21:1.
 * - A visual hint only: `aria-hidden`, not focusable, not a target. Scrolling
 *   is already every reader's own gesture; a control would add a stop to the
 *   tab order that does nothing a keyboard cannot already do.
 * - Gone at the first scroll, and never back: once the reader has scrolled
 *   they know. Hidden with `visibility`, not faded, because nothing inside
 *   `<main>` may animate opacity (identity-lines guard).
 * - Its nudge runs three times and stops, 1.92s in all, well under WCAG 2.2.2's
 *   five-second allowance; with reduced motion it is still (`motion.css`).
 * - It is the longest animation on the Strategic Plan as loaded, so the
 *   identity-lines guard, which scrubs every animation on the page to the end of
 *   the longest, steps through it there. Once scrolled it drops its animation,
 *   so the guard's measurement after the reveal is not lengthened by it
 *   (`scroll-cue-guard-cost.spec.ts`).
 * - Without JavaScript it stays, which is harmless: it points at content that
 *   is there.
 */

/** The strokes' lengths inside the 44px disc, in the logo's order and spacing
 *  (green 81.2 units, red 40.8, tails 32.66 apart; ADR-0069 D10). At the logo's
 *  own proportions a stroke this short is under 2px thick, so both take a
 *  fixed 3px thickness, drawn from the same `RIBBONS` shapes,
 *  the one departure from the mark, recorded in ADR-0079. */
const GREEN_LENGTH = 22;
const UNIT = GREEN_LENGTH / 81.2;
const RED_LENGTH = 40.8 * UNIT;
const SPACING = 32.66 * UNIT;
const THICKNESS = 3;
const BASELINE = 24;
const GROUP_WIDTH = SPACING + GREEN_LENGTH * Math.SQRT1_2;
const TAIL_X = (44 - GROUP_WIDTH) / 2;

const stroke = (ribbon: { d: string; width: number; height: number }, length: number, tailX: number) =>
  `translate(${tailX.toFixed(2)} ${BASELINE}) rotate(-45) scale(${(length / ribbon.width).toFixed(4)} ${(THICKNESS / ribbon.height).toFixed(4)}) translate(0 ${-ribbon.height / 2})`;

export const ScrollCue = ({ placement = "overlay", className = "" }: {
  /** `overlay`: centred on the bottom of its positioned hero. `inline`: in the
   *  flow of a row, as on the homepage's next-event band. */
  placement?: "overlay" | "inline";
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cue = ref.current;
    if (!cue) return;
    const hide = () => {
      cue.dataset.scrolled = "true";
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (window.scrollY > 0) hide();
    };
    // A reload or a back navigation can restore a scrolled page; the hint is
    // already answered there.
    if (window.scrollY > 0) {
      hide();
      return;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-scroll-cue=""
      className={`scroll-cue pointer-events-none flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[color:var(--color-surface-overlay)] ${
        placement === "overlay" ? "absolute inset-x-0 bottom-[var(--space-4)] z-10 mx-auto" : ""
      } ${className}`}
    >
      <svg viewBox="0 0 44 44" className="block size-full" focusable="false">
        <path d={RIBBONS.red.d} fill="var(--color-brand-secondary)" transform={stroke(RIBBONS.red, RED_LENGTH, TAIL_X)} />
        <path d={RIBBONS.green.d} fill="var(--color-brand-primary)" transform={stroke(RIBBONS.green, GREEN_LENGTH, TAIL_X + SPACING)} />
        <path
          d="M16 29.5 22 35.5 28 29.5"
          fill="none"
          stroke="var(--color-text-on-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};
