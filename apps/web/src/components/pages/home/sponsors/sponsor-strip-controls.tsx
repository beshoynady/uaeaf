"use client";

import { useEffect, useRef, useState } from "react";
import { FOCUS, TOUCH_TARGET, TRANSITION } from "@/components/ui/interactive";

/**
 * The strip's pause button, and the switch that lets the strip move at all
 * (ADR-0085 D7, WCAG 2.2.2).
 *
 * The loop is CSS (`motion.css`, `.sponsor-strip`): one `transform` keyframe
 * whose play state is read from `data-paused`. This component only marks the
 * strip `data-enhanced` once it is on the page, because a button that could not
 * work must never sit beside moving content, and flips `data-paused`.
 *
 * Hover and focus inside the strip hold the loop too (CSS); the button is the
 * control that stays held until it is pressed again. What it is called and
 * what it shows are separate: `aria-label` carries the full sentence a screen
 * reader reads, and the face carries the glyph alone (ADR-0086 D1). Under
 * reduced motion the CSS draws neither the loop nor this button.
 */
export const SponsorStripControls = ({
  trackId,
  labels,
}: {
  trackId: string;
  /** What the button is *called*. It is the `aria-label` and nothing is
   *  printed from it: the strip's subject is the sponsors, and at 390px the
   *  full sentence was the loudest thing in the band (ADR-0086 D1). */
  labels: { pause: string; play: string };
}) => {
  const [paused, setPaused] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const strip = button.current?.closest<HTMLElement>("[data-sponsor-strip]");
    if (!strip) return;
    strip.dataset.enhanced = "";
    return () => {
      delete strip.dataset.enhanced;
    };
  }, []);

  useEffect(() => {
    const strip = button.current?.closest<HTMLElement>("[data-sponsor-strip]");
    if (!strip) return;
    if (paused) strip.dataset.paused = "";
    else delete strip.dataset.paused;
  }, [paused]);

  return (
    <button
      ref={button}
      type="button"
      aria-controls={trackId}
      aria-pressed={paused}
      // The name a screen reader speaks, unchanged and stated outright rather
      // than inherited from whatever happens to be printed inside.
      aria-label={paused ? labels.play : labels.pause}
      onClick={() => setPaused((value) => !value)}
      // Square and quiet: the register's own edge rather than a filled
      // ground, at the interactive minimum of 44px in both directions so the
      // target never depends on how long a word is (ADR-0086 D1).
      className={`strip-pause ${TOUCH_TARGET} size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-section-black-border)] text-body-sm hover:bg-[color:var(--color-section-black-divider)] active:opacity-80 ${TRANSITION} ${FOCUS}`}
    >
      <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
    </button>
  );
};
