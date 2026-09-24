"use client";

import { useEffect } from "react";

/**
 * The cards' one-shot entrance.
 *
 * The same shape as the site's `RevealOnce` (ADR-0069 D10) and for the same
 * reason: a CSS scroll-driven reveal replays every time a block re-enters the
 * view, and the owner excluded that repetition. It is a second component
 * rather than a reuse because this system's markers, stagger variable and
 * reduced-motion rule are its own (`video-system.css`), and pointing the
 * shared script at them would make the shared script care about this system.
 *
 * The conditions are part of the decision:
 *
 * 1. The server HTML is complete and at rest. Without this script nothing is
 *    ever marked `waiting`, so nothing is hidden -- a reader whose JavaScript
 *    never arrives gets the cards, not the space where they would have been.
 * 2. Only a card that starts below the viewport waits. One already on screen
 *    is left alone, so nothing above the fold flashes in.
 * 3. A card reveals once, and its observation ends there.
 * 4. Under `prefers-reduced-motion` nothing is marked at all: the cards are
 *    simply there. (The CSS also collapses the animation, so the two agree
 *    even if this script runs and the preference changes afterwards.)
 */
export const VideoReveal = () => {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = [...document.querySelectorAll<HTMLElement>(".vs-rise")];
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          const card = entry.target as HTMLElement;
          // The index within THIS batch, so a row entering together staggers
          // across itself rather than inheriting a delay from the row above.
          card.style.setProperty("--vs-reveal-index", String(index));
          card.dataset.vsReveal = "in";
          observer.unobserve(card);
        });
    });

    for (const card of cards) {
      if (card.dataset.vsReveal === "in") continue;
      // A card already `waiting` was marked by an earlier run whose observer
      // has since been disconnected (StrictMode runs the effect twice), so it
      // is watched again rather than left waiting for nothing.
      if (!card.dataset.vsReveal) {
        if (card.getBoundingClientRect().top < window.innerHeight) continue;
        card.dataset.vsReveal = "waiting";
      }
      observer.observe(card);
    }

    return () => observer.disconnect();
  });

  return null;
};
