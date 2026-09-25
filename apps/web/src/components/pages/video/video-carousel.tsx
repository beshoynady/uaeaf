"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FOCUS } from "@/components/ui/interactive";
import { IconButton, BRAND_FOCUSABLE, BRAND_FOCUS_WIDE } from "@uaeaf/brand-ui";

/**
 * The landscape rail: four cards at rest, the next one showing at the edge.
 *
 * -- Why a scrolling rail and not a transform track -------------------------
 *
 * The rail is a real overflow container with `scroll-snap` (`video-system.css`).
 * That single decision buys touch dragging, trackpad flicks, momentum, the
 * browser's own arrow-key scrolling and correct RTL behaviour without any of
 * them being implemented -- and it means the cards are never moved out from
 * under a reader who is mid-gesture. A transform track would have to reproduce
 * all of it, and would still get the Arabic case wrong.
 *
 * The arrows and dots move the rail with `scrollBy`/`scrollTo`, which respects
 * the same snap points; nothing here maintains a parallel idea of "the current
 * index" that the rail could disagree with. The dot state is READ from the
 * scroll position, not commanded.
 *
 * -- Why the peek is a fractional basis ------------------------------------
 *
 * The design shows the next card cut off at the edge. That peek is what tells
 * a reader the row continues -- without it, four cards in a viewport look like
 * four cards total. It is expressed as the card's own width rather than as
 * padding, so the snap point stays on the card's leading edge.
 *
 * -- RTL, measured rather than assumed --------------------------------------
 *
 * In an RTL overflow container `scrollLeft` runs from 0 down to
 * `-(scrollWidth - clientWidth)`, and `scrollBy`/`scrollTo` work in that same
 * signed space. Measured in Chromium on this project's own rail (800px
 * viewport, 2000px content):
 *
 *   scrollBy({ left: +800 })  ->  scrollLeft 0     (no movement)
 *   scrollBy({ left: -800 })  ->  scrollLeft -800  (one page FORWARD)
 *
 * So a positive delta is backwards in Arabic, not forwards. `RAIL_SIGN` below
 * carries that, and it is read from the COMPUTED direction: the `dir` IDL
 * property reflects the element's own `dir` attribute, which this rail does
 * not have -- the direction comes from `<html>`, and `rail.dir` measured as
 * the empty string.
 *
 * Reading the position back needs no sign, because `measure()` takes the
 * magnitude.
 */

export const VideoCarousel = ({
  heading,
  children,
  labels,
}: {
  heading: ReactNode;
  /** One element per card; the rail owns their widths. */
  children: ReactNode[];
  labels: { previous: string; next: string; goTo: string; rail: string };
}) => {
  const rail = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const node = rail.current;
    if (!node) return;
    // `scrollWidth - clientWidth` is the total travel. A rail that fits shows
    // one dot, which the render below drops entirely.
    const travel = node.scrollWidth - node.clientWidth;
    const step = node.clientWidth;
    const count = travel <= 1 ? 1 : Math.ceil(node.scrollWidth / step);
    setPages(count);
    setPage(travel <= 1 ? 0 : Math.round(Math.abs(node.scrollLeft) / step));
  }, []);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, children.length]);

  /** +1 in English, -1 in Arabic. See the header: measured, not assumed. */
  const railSign = (node: HTMLElement): 1 | -1 =>
    getComputedStyle(node).direction === "rtl" ? -1 : 1;

  /** An explicit `behavior` overrides the CSS `scroll-behavior`, and Chromium
   *  does not suppress it for `prefers-reduced-motion` — so the preference is
   *  asked here rather than left to the stylesheet. */
  const behavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  /** `direction` is reading order: +1 is the next card in either language. */
  const move = (direction: 1 | -1) => {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: railSign(node) * direction * node.clientWidth, behavior: behavior() });
  };

  const goTo = (index: number) => {
    const node = rail.current;
    if (!node) return;
    node.scrollTo({ left: railSign(node) * index * node.clientWidth, behavior: behavior() });
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {heading}

        {pages > 1 ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: pages }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`${labels.goTo} ${index + 1}`}
                  aria-current={index === page ? "true" : undefined}
                  // A 4px bar is far under the 44px target floor, so the
                  // control is 44px tall and transparent, with the bar drawn
                  // inside it. The reader aims at what they see and hits a
                  // target they do not.
                  className="group inline-flex h-11 items-center px-0.5 focus-visible:outline-none"
                >
                  <span
                    className="block h-1 rounded-full transition-all duration-[var(--motion-duration-fast)] group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--a11y-focus-ring)]"
                    style={{
                      inlineSize: index === page ? 26 : 12,
                      background: index === page ? "var(--surface-btn-primary-bg)" : "color-mix(in srgb, var(--surface-text) 22%, transparent)",
                    }}
                  />
                </button>
              ))}
            </div>

            <IconButton shape="circle" onClick={() => move(-1)} disabled={page === 0} aria-label={labels.previous}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 5.5 8 12l6.5 6.5" />
              </svg>
            </IconButton>
            <IconButton shape="circle" onClick={() => move(1)} disabled={page >= pages - 1} aria-label={labels.next}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 5.5 16 12l-6.5 6.5" />
              </svg>
            </IconButton>
          </div>
        ) : null}
      </div>

      {/* `tabindex=0` because the rail scrolls: WCAG 2.1.1 requires a
          scrollable region to be reachable and operable from a keyboard, and
          the browser's own arrow-key handling does the operating once it can
          be focused. How many cards fit is `--vs-visible`, set per breakpoint
          in `video-system.css`. */}
      <div
        ref={rail}
        tabIndex={0}
        role="group"
        aria-label={labels.rail}
        className={`vs-rail gap-4 pb-1 ${BRAND_FOCUSABLE} ${BRAND_FOCUS_WIDE}`}
      >
        {children}
      </div>
    </section>
  );
};
