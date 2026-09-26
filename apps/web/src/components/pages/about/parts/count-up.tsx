"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { AppLocale } from "@/i18n/routing";

/**
 * A number that counts to itself, once, when it first comes into view.
 *
 * ── Why the finished number is in the server HTML ─────────────────────────
 *
 * The element renders its final value and only then starts from a lower one.
 * A crawler, a printed page, a browser with JavaScript off and a reader who
 * arrives mid-page by anchor or by a restored scroll all see the real figure,
 * because the real figure is what the server sent. The count is decoration
 * laid over it.
 *
 * ── Why it never runs twice ──────────────────────────────────────────────
 *
 * The observer disconnects on the first intersection. A figure that re-counts
 * every time it is scrolled past reads as a glitch rather than a flourish, and
 * the owner's reveal decision for this site is one-shot everywhere.
 *
 * ── Reduced motion ───────────────────────────────────────────────────────
 *
 * Nothing runs at all: the final value stands, which it already was.
 *
 * `useState` starts at the final value rather than at zero on purpose — the
 * first client render must match the server's, or React replaces the text and
 * the page flickers before the count begins.
 *
 * ── Why it formats, rather than being handed a formatter ──────────────────
 *
 * It takes a locale, not a `format` function. A function cannot cross from a
 * server component to a client one — React refuses it, and the page answers
 * 500 — and two of the three callers here are server components. Taking the
 * locale also means one `Intl.NumberFormat` per mounted number instead of one
 * per render.
 */
export const CountUp = ({
  value,
  locale,
  grouping = true,
  durationMs = 1100,
}: {
  value: number;
  locale: AppLocale;
  /** Off for a year: "1974", never "1,974". */
  grouping?: boolean;
  durationMs?: number;
}) => {
  const reduced = useReducedMotion();
  // Latin digits throughout (Chapter 19 §5): `ar` alone would reach them only
  // by the locale's default rather than by a decision.
  const format = useMemo(
    () => new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: grouping }),
    [locale, grouping],
  );
  const [shown, setShown] = useState(value);
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced || !("IntersectionObserver" in window)) {
      return;
    }
    const node = element.current;
    if (!node) {
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        observer.disconnect();

        const started = performance.now();
        const step = (now: number) => {
          const elapsed = now - started;
          if (elapsed >= durationMs) {
            setShown(value);
            return;
          }
          // Eased out, so the last digits settle rather than snapping.
          const progress = 1 - (1 - elapsed / durationMs) ** 3;
          setShown(Math.round(value * progress));
          frame = requestAnimationFrame(step);
        };
        setShown(0);
        frame = requestAnimationFrame(step);
      },
      { rootMargin: "-10%" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs, reduced]);

  return <span ref={element}>{format.format(shown)}</span>;
};
