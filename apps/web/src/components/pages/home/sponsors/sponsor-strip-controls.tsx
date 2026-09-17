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
 * control that stays held until it is pressed again. Under reduced motion the
 * CSS draws neither the loop nor this button.
 */
export const SponsorStripControls = ({
  trackId,
  labels,
}: {
  trackId: string;
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
      onClick={() => setPaused((value) => !value)}
      className={`strip-pause ${TOUCH_TARGET} min-w-11 items-center justify-center gap-2 rounded-full border border-[color:var(--color-section-black-border)] px-4 text-body-sm font-semibold hover:bg-[color:var(--color-section-black-divider)] active:opacity-80 ${TRANSITION} ${FOCUS}`}
    >
      <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
      <span>{paused ? labels.play : labels.pause}</span>
    </button>
  );
};
