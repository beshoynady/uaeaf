"use client";

import { useEffect } from "react";

/**
 * The one-shot reveal below the portrait hero (ADR-0069 D10, Q13 amended), and
 * on the pages that took it up since.
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
 * 4. Under `prefers-reduced-motion: reduce` it leaves every block at rest,
 *    except one marked `data-reveal-reduced="fade"`: that block still waits
 *    and fades in, with no transform (`motion.css`). The homepage news and
 *    media sections carry it (owner decision 2026-09-22); nowhere else does.
 *
 * Blocks entering the view together are staggered in the order they were
 * observed, which is document order and so reading order in either language.
 */
export const RevealOnce = () => {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
      (block) => !reduced || block.dataset.revealReduced === "fade",
    );
    if (blocks.length === 0) return;

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

    for (const block of blocks) {
      if (block.dataset.revealState === "revealed") continue;
      // A block already `waiting` was marked by an earlier run of this effect
      // whose observer has since been disconnected (StrictMode runs it twice),
      // so it is watched again rather than left waiting for nothing.
      if (!block.dataset.revealState) {
        if (block.getBoundingClientRect().top < window.innerHeight) continue;
        block.dataset.revealState = "waiting";
      }
      observer.observe(block);
    }

    return () => observer.disconnect();
  }, []);

  return null;
};
