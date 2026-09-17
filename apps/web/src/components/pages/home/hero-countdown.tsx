"use client";

import { useEffect, useState } from "react";
import { eventBarState } from "@uaeaf/content/hero";
import type { EventBarState, NextEventLike } from "@uaeaf/content/hero";

/**
 * The next event's countdown, kept current by the minute.
 *
 * The server draws the first value, so a reader without JavaScript and the
 * first frame both show a real figure, and hydration starts from exactly that
 * value. The browser then recomputes with the same `eventBarState` the server
 * and the dashboard's preview use, on each minute boundary, never each second:
 * the figure is days, hours and minutes, and a ticking seconds field would pull
 * the eye away from the athlete for nothing.
 *
 * Not a live region (`aria-live="off"`): a value that changes every minute
 * would interrupt a screen reader for a figure nobody asked to hear again. Its
 * whole meaning is in one accessible name.
 */
export const HeroCountdown = ({
  event,
  initial,
  labels,
}: {
  event: NextEventLike;
  initial: EventBarState;
  labels: { days: string; hours: string; minutes: string; live: string; countdown: string };
}) => {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const now = new Date();
      setState(eventBarState(event, now));
      // To the next whole minute, so the figure changes when the clock does.
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [event]);

  if (state.state === "live") {
    return (
      <span aria-live="off" className="text-body-sm font-bold">
        {labels.live}
      </span>
    );
  }
  // Over while the page was open: the countdown says nothing rather than a
  // negative figure, and the next render of the page draws no bar at all.
  if (state.state !== "before") return null;

  const units = [
    [state.days, labels.days],
    [state.hours, labels.hours],
    [state.minutes, labels.minutes],
  ] as const;
  const name = labels.countdown
    .replace("{days}", String(state.days))
    .replace("{hours}", String(state.hours))
    .replace("{minutes}", String(state.minutes));

  return (
    <span aria-live="off" role="timer" aria-label={name} className="flex items-baseline gap-3">
      {units.map(([value, unit]) => (
        <span key={unit} aria-hidden="true" className="flex items-baseline gap-1">
          {/* Tabular figures: a 9 becoming 10 does not shift its neighbours. */}
          <span className="text-body font-bold tabular-nums">{String(value).padStart(2, "0")}</span>
          <span className="text-caption opacity-85">{unit}</span>
        </span>
      ))}
    </span>
  );
};
