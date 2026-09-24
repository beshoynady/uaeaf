"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * The wall clock, re-read once a minute.
 *
 * -- Why this is not `useState` plus an interval ------------------------------
 *
 * The clock is an external mutable source, and React has one primitive for
 * reading those: `useSyncExternalStore`. Written as an effect that seeds state
 * on mount, it sets state synchronously during the effect — a cascading render
 * on every mount, and the pattern React's own lint now refuses.
 *
 * -- Why the server snapshot is `null` ---------------------------------------
 *
 * The server's clock and the browser's are a request apart, which is enough to
 * disagree on the minute and produce a hydration mismatch on anything derived
 * from them. `null` means "nobody has read a clock yet", so the server and the
 * hydrating client render the same thing, and the figure appears on the render
 * after hydration.
 *
 * -- Why the snapshot is cached ----------------------------------------------
 *
 * `getSnapshot` must return the same value until something changes, or React
 * re-renders forever. `Date.now()` read directly is a different number every
 * call; the store keeps one value and replaces it only when the interval
 * fires.
 */
const TICK_MS = 60_000;

const createClock = () => {
  let value = Date.now();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      timer ??= setInterval(() => {
        value = Date.now();
        for (const listener of listeners) listener();
      }, TICK_MS);

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => value,
    getServerSnapshot: (): number | null => null,
  };
};

/** The current minute, or `null` before the first client render has happened. */
export const useMinuteClock = (): number | null => {
  // One store per component instance, created once. A module-level store would
  // keep ticking after the last banner unmounted.
  const [clock] = useState(createClock);

  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot);
};
