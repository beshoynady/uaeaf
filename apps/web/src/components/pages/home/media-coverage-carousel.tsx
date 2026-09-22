"use client";

import { Children, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CarouselControls } from "@/components/ui/carousel-controls";
import { revealStep } from "@/lib/motion/reveal";

/**
 * The coverage row: a horizontal track that scrolls a page at a time, with the
 * shared carousel controls under it (`CMP-CAROUSEL-001`).
 *
 * Nothing moves on its own, so there is nothing to pause (WCAG 2.2.2). The
 * track is a native scroll container with snapping, so a trackpad, a swipe
 * and the keyboard (once a card's link has focus) work without this script,
 * and the controls only move it. A page is the track's own width; the count
 * is measured, never assumed, and the controls appear only when there is more
 * than one.
 *
 * In the section's reveal the cards are steps 2 onward, drifting in along the
 * reading direction, and the controls follow the last of them.
 *
 * The edge fade sits at the end the track continues toward: the reading
 * direction's end, which in Arabic is the left. The canvas draws it at the
 * start, over the first card.
 */
export const MediaCoverageCarousel = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("HomeCoverage");
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [current, setCurrent] = useState(0);
  const slides = Children.toArray(children);

  /** Read from the track as it is now, never from a value kept since. */
  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const width = element.clientWidth;
    // A track read mid-layout has no width yet while its cards already do:
    // dividing by it would make the page count infinite. The next resize
    // measures it for real.
    if (width <= 0) return;
    const travel = element.scrollWidth - width;
    const count = travel > 1 ? Math.ceil(travel / width) + 1 : 1;
    // `scrollLeft` runs negative in a right-to-left track.
    const position = Math.abs(element.scrollLeft);
    setPages(count);
    setCurrent(position >= travel - 1 ? count - 1 : Math.min(count - 1, Math.round(position / width)));
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [measure]);

  /** One page along the reading direction. The smoothing is the track's own
   *  `scroll-behavior`, which the reduced-motion reset turns off. */
  const step = (pagesForward: number) => {
    const element = track.current;
    if (!element) return;
    const direction = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    element.scrollBy({ left: direction * pagesForward * element.clientWidth });
  };

  return (
    <div className="flex flex-col gap-9">
      <div className="relative">
        <div
          id={trackId}
          ref={track}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("carouselLabel")}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={t("slideLabel", { index: index + 1, count: slides.length })}
              data-reveal-part="drift"
              style={revealStep(2 + index)}
              className="w-[308px] max-w-[85%] shrink-0 snap-start"
            >
              {slide}
            </div>
          ))}
        </div>
        {current < pages - 1 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-0 w-[72px] from-transparent to-[var(--color-surface-base)] ltr:bg-linear-to-r rtl:bg-linear-to-l"
          />
        ) : null}
      </div>

      {pages > 1 ? (
        <div data-reveal-part="rise" style={revealStep(2 + slides.length)}>
          <CarouselControls
            pages={pages}
            current={current}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            controls={trackId}
            labels={{
              previous: t("previous"),
              next: t("next"),
              position: t("position", { index: current + 1, count: pages }),
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
