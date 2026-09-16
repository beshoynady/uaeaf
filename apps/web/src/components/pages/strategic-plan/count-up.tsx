"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A key figure that counts up once, when it enters the view (brief م٤-أ).
 *
 * - The server prints the final figure. Without JavaScript, under
 *   `prefers-reduced-motion: reduce`, or in a browser without
 *   `IntersectionObserver`, that is what stays: the count is an addition,
 *   never a condition for reading the number.
 * - The figure is stored as text ("2030", "15", "+30%"). A whole figure is
 *   counted from zero to its value; anything around it (a sign, a percent) is
 *   printed as stored throughout. A figure with a decimal or grouping mark
 *   ("1.5M", "1,200") or without Western digits is printed as stored and not
 *   counted: counting its first run of digits alone would show "0.5M".
 * - Three spans so nothing moves: a hidden copy for assistive technology
 *   carrying the real text, an invisible copy that sets the width of the final
 *   figure, and the counting copy over it. `tabular-nums` keeps every
 *   intermediate figure inside that width.
 * - The duration is `--motion-duration-slower`, read from the stylesheet, and
 *   the curve decelerates as the identity's entrances do; no literal here.
 */

const FIGURE = /^([^\d]*)(\d+)([^\d.,٫٬]*)$/;

/** The parts of a figure that can be counted, or null when it is printed as stored. */
export const countable = (value: string): { prefix: string; target: number; suffix: string } | null => {
  const parsed = value.match(FIGURE);
  if (!parsed) return null;
  const [, prefix, digits, suffix] = parsed;
  if (/[.,٫٬]/.test(prefix)) return null;
  return { prefix, target: Number(digits), suffix };
};

const readDuration = (): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-slower").trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith("ms") ? value : value * 1000;
};

/** The decelerating curve, cubic-bezier(0, 0, 0.2, 1) in its ease-out shape. */
const decelerate = (t: number): number => 1 - (1 - t) ** 3;

export const CountUp = ({ value, className = "" }: { value: string; className?: string }) => {
  const [shown, setShown] = useState(value);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const parts = countable(value);
    const element = box.current;
    if (!parts || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const { prefix, target, suffix } = parts;
    let frame = 0;

    // Half the figure in view before it counts, so the count is seen from its
    // start rather than finished at the viewport's edge.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const duration = readDuration();
      if (duration === 0) return;
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        // No leading zeros: a year counting up read "0000". The invisible copy
        // already holds the final figure's width, so nothing moves.
        const current = Math.round(target * decelerate(progress));
        setShown(`${prefix}${current}${suffix}`);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    // `dir="ltr"`: a signed figure ("+30%") is a number, and the bidi
    // algorithm would otherwise move its sign in an Arabic paragraph.
    <span ref={box} dir="ltr" data-count={value} className={`relative inline-block ${className}`}>
      <span data-part="value" className="sr-only">
        {value}
      </span>
      <span aria-hidden="true" className="invisible">
        {value}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        {shown}
      </span>
    </span>
  );
};
