"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Whether a continuously-animating element should be moving right now.
 *
 * ADR-0099 D1 permits unprompted motion only while six conditions hold
 * together, and five of them are state this hook owns: the reader's motion
 * preference, whether the element is on screen, whether the tab is visible,
 * whether they are pointing at it, and whether focus is inside it. The sixth —
 * a visible pause control — is markup, so it cannot live here; the contract
 * test checks for it in the components that call this.
 *
 * One boolean rather than five, because a condition written out by hand at
 * each call site is a condition the next component forgets, and a forgotten
 * one is invisible: the animation simply keeps running somewhere nobody is
 * looking, which is the failure the clause exists to prevent.
 *
 * Reduced motion is answered once, not watched. A reader who changes that
 * preference mid-visit is changing an operating-system setting, and the page
 * they get afterwards is the next one they load.
 */

export interface AmbientMotion {
  /** Whether the animation should be running this render. */
  running: boolean;
  /** Whether the reader has pressed pause. Distinct from `running`, which is
   *  also false for reasons the reader did not choose. */
  paused: boolean;
  /** Whether unprompted motion is possible at all. False under reduced
   *  motion, so a pause control can describe the real state instead of
   *  offering to stop something that was never going to move. */
  available: boolean;
  /** Flips the reader's pause. */
  toggle: () => void;
  /** Spread onto the animating element. Hover and focus are props rather than
   *  listeners so the element keeps them in its own JSX, where a reader of
   *  that component can see that it stops. */
  handlers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const useAmbientMotion = (ref: RefObject<HTMLElement | null>): AmbientMotion => {
  // Read once, on the client, after hydration: the server has no reader and no
  // preference, and answering `true` there would send markup that disagrees
  // with the first client render.
  const [reduced, setReduced] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const [paused, setPaused] = useState(false);

  // Hover and focus are separate reasons to stop, and a reader can be doing
  // both. One counter rather than two booleans, so leaving the pointer while
  // focus is still inside does not restart it.
  const engagements = useRef(0);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      setOnScreen(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(element);
    // Disconnected on unmount: an observer left holding a detached element is
    // a leak that grows with every route change.
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const engage = useCallback(() => {
    engagements.current += 1;
    setEngaged(true);
  }, []);

  const disengage = useCallback(() => {
    engagements.current = Math.max(0, engagements.current - 1);
    setEngaged(engagements.current > 0);
  }, []);

  const toggle = useCallback(() => setPaused((was) => !was), []);

  const available = !reduced;

  return {
    running: available && onScreen && tabVisible && !engaged && !paused,
    paused,
    available,
    toggle,
    handlers: {
      onPointerEnter: engage,
      onPointerLeave: disengage,
      onFocus: engage,
      onBlur: disengage,
    },
  };
};
