"use client";

import { useEffect } from "react";

/**
 * The one-shot reveal below the portrait hero (ADR-0069 D10, Q13 amended).
 *
 * A CSS scroll-driven reveal replays whenever a block re-enters the view, and
 * the owner excluded that repetition. The conditions this follows are part of
 * the decision:
 *
 * 1. The server HTML is complete and at rest. Without this script no block is
 *    ever marked, so nothing waits offset and nothing is hidden.
 * 2. Only a block that starts below the viewport is marked `waiting`; one
 *    already visible, or already scrolled past, is left alone. Nothing here
 *    touches `opacity` or `visibility`: the offset is a `transform` in
 *    `motion.css`.
 * 3. A block is revealed once, and its observation ends there.
 * 4. Under `prefers-reduced-motion: reduce` it does nothing.
 *
 * Blocks entering the view together are staggered in the order they were
 * observed, which is document order and so reading order in either language.
 */
export const RevealOnce = () => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          const block = entry.target as HTMLElement;
          block.style.setProperty("--reveal-batch", String(index));
          block.dataset.revealState = "revealed";
          observer.unobserve(block);
        });
    });

    for (const block of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      if (block.dataset.revealState) continue;
      if (block.getBoundingClientRect().top < window.innerHeight) continue;
      block.dataset.revealState = "waiting";
      observer.observe(block);
    }

    return () => observer.disconnect();
  }, []);

  return null;
};
