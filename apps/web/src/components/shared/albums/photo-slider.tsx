"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { BRAND_FOCUSABLE, BRAND_FOCUS_WIDE, BRAND_VISUALLY_HIDDEN, IconButton } from "@uaeaf/brand-ui";

import {
  EAGER_RADIUS,
  RENDER_RADIUS,
  arrowStep,
  clampIndex,
  padOrdinal,
  renderWindow,
  slideImage,
} from "@/lib/albums/photo-window";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import { Filmstrip } from "./filmstrip";
import { LaneProgress } from "./lane-progress";
import { PhotoShare } from "./photo-share";

import "./viewer.css";

export interface PhotoSliderProps {
  /** The photos loaded so far, in album order. */
  photos: readonly ViewerPhoto[];
  /** Zero-based current photo. The slider is controlled: it asks, the viewer
   *  decides, so autoplay, the grid and the deep link share one index. */
  index: number;
  /** Photos in the whole album, which may exceed `photos.length` while later
   *  pages are still arriving. */
  total: number;
  onIndexChange: (index: number) => void;
  /** Autoplay is on: the current photo pushes in, and the position stops
   *  being announced every five seconds. */
  playing: boolean;
  /** Move focus to the stage on mount — set when the reader arrives from the
   *  index grid, so the keyboard lands where the photo is. */
  autoFocus?: boolean;
}

/**
 * The reading direction of the DOCUMENT.
 *
 * Not `element.dir`: that property reflects the element's own attribute, and
 * in this codebase only `<html>` carries one — every other element reads `""`.
 */
const documentDirection = (): "rtl" | "ltr" => {
  const declared = document.documentElement.getAttribute("dir");
  if (declared === "rtl" || declared === "ltr") return declared;
  return getComputedStyle(document.documentElement).direction === "rtl" ? "rtl" : "ltr";
};

const Chevron = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

/**
 * The slideshow: a stage of large photos, the one in front at full size and
 * its neighbours shrunk under the ink veil, then the caption row, the lane
 * and the filmstrip.
 *
 * -- A moving row, windowed ----------------------------------------------
 *
 * The row moves by whole slides (`translateX(--dirx * -index * (W + G))`),
 * but only ±8 slides around the current one exist. A spacer stands in for the
 * slides before the window, so the arithmetic is the same as if all were
 * there. A jump wider than the window (the grid, a deep link) cuts instead of
 * sliding: sliding would sweep across slides that are not mounted.
 *
 * -- Keyboard --------------------------------------------------------------
 *
 * The stage is a focusable region. Arrow keys move in the reading direction —
 * ArrowLeft is "next" in Arabic — and Home / End go to the ends. The two
 * arrow buttons do the same for a pointer, disabled at the ends rather than
 * wrapping, so the last photo says it is the last.
 */
export const PhotoSlider = ({ photos, index, total, onIndexChange, playing, autoFocus = false }: PhotoSliderProps) => {
  const t = useTranslations("albums.viewer");
  const stage = useRef<HTMLDivElement>(null);

  // What changed since the last render, kept as state rather than read from a
  // ref so it is decided during render, before the track paints: whether the
  // move is a cut, and whether the reader has moved at all (the finish line
  // marks an arrival, and the first photo did not arrive — it was there).
  const [shown, setShown] = useState({ index, instant: true, arrived: false });
  if (shown.index !== index) {
    setShown({ index, instant: Math.abs(index - shown.index) > RENDER_RADIUS, arrived: true });
  }

  useEffect(() => {
    if (autoFocus) stage.current?.focus();
  }, [autoFocus]);

  const count = photos.length;
  const last = count - 1;
  const go = (next: number) => {
    const target = clampIndex(next, count);
    if (target !== index) onIndexChange(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      go(event.key === "Home" ? 0 : last);
      return;
    }
    const step = arrowStep(event.key, documentDirection());
    if (step === 0) return;
    event.preventDefault();
    go(index + step);
  };

  const current = photos[index];
  if (!current) return null;

  const visible = renderWindow(index, count);
  const lead = visible[0] ?? 0;
  const ordinal = padOrdinal(index + 1, total);
  const totalLabel = padOrdinal(total, total);
  const credit = current.credit
    ? current.source
      ? t("creditWithSource", { credit: current.credit, source: current.source })
      : t("credit", { credit: current.credit })
    : null;

  const counter = (
    <span className="av-counter text-body-sm text-[color:var(--surface-text-muted)]" aria-hidden="true">
      <b className="text-[color:var(--surface-text)]">{ordinal}</b> / {totalLabel}
    </span>
  );

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="av-stage-wrap">
        <div
          ref={stage}
          className={`av-stage ${BRAND_FOCUSABLE} ${BRAND_FOCUS_WIDE}`}
          tabIndex={0}
          role="region"
          aria-roledescription={t("carousel")}
          aria-label={t("stage")}
          onKeyDown={onKeyDown}
        >
          <div
            className="av-track"
            data-instant={shown.instant ? "" : undefined}
            style={{ "--av-i": index } as CSSProperties}
          >
            {lead > 0 ? (
              <div className="av-spacer" aria-hidden="true" style={{ "--av-lead": lead } as CSSProperties} />
            ) : null}
            {visible.map((position) => {
              const photo = photos[position];
              const isCurrent = position === index;
              const image = slideImage(photo.src, isCurrent);
              return (
                <div
                  key={photo.id}
                  className="av-slide"
                  data-current={isCurrent ? "" : undefined}
                  data-kenburns={isCurrent && playing ? "" : undefined}
                  // Only the photo in front is content; its neighbours are a
                  // glimpse of what is next and would otherwise be read out
                  // as sixteen more images.
                  aria-hidden={isCurrent ? undefined : true}
                  role="group"
                  aria-roledescription={t("slide")}
                  aria-label={t("position", { current: position + 1, total })}
                >
                  <div className="av-slide__frame" data-fit={photo.width >= photo.height ? "cover" : "contain"}>
                    {/* The photo in front offers both stage widths and lets
                        the browser choose for its box and screen; the rest
                        are one soft file each (photo-window.ts). The box is
                        reserved by `width`/`height` and the slide's own
                        aspect ratio, so a swap of file moves nothing. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- the CDN resizes; see photo-window.ts. */}
                    <img
                      className="av-slide__img"
                      src={image.src}
                      srcSet={image.srcSet}
                      sizes={image.sizes}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading={Math.abs(position - index) <= EAGER_RADIUS ? "eager" : "lazy"}
                      fetchPriority={isCurrent ? "high" : undefined}
                      decoding="async"
                      draggable={false}
                    />
                    <span className="av-slide__veil" aria-hidden="true" />
                    {/* Keyed by the index so each arrival mounts a fresh line
                        and the sweep replays. */}
                    {isCurrent && shown.arrived && !shown.instant ? (
                      <span key={index} className="av-finish" aria-hidden="true" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="av-controls">
          <IconButton shape="circle" aria-label={t("previous")} disabled={index <= 0} onClick={() => go(index - 1)}>
            <Chevron path="M14.5 5.5 8 12l6.5 6.5" />
          </IconButton>
          {counter}
          <IconButton shape="circle" aria-label={t("next")} disabled={index >= last} onClick={() => go(index + 1)}>
            <Chevron path="M9.5 5.5 16 12l-6.5 6.5" />
          </IconButton>
        </div>
      </div>

      <div className="av-meta">
        <div className="flex min-w-0 items-center gap-4">
          <span className="av-numeral" aria-hidden="true">
            {ordinal}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            {current.caption ? <p className="text-h4 font-bold text-[color:var(--surface-text)]">{current.caption}</p> : null}
            {credit ? <p className="text-body-sm text-[color:var(--surface-text-muted)]">{credit}</p> : null}
          </div>
        </div>
        <div className="av-meta__end">
          {counter}
          <PhotoShare photoId={current.id} />
        </div>
      </div>

      {/* The position in words. Silent while autoplay runs (WCAG 2.2.2's
          companion concern): a region that speaks every five seconds talks
          over everything else the reader is doing. */}
      <span className={BRAND_VISUALLY_HIDDEN} aria-live={playing ? "off" : "polite"} aria-atomic="true">
        {t("position", { current: index + 1, total })}
      </span>

      <LaneProgress index={index} total={total} />
      <Filmstrip photos={photos} index={index} total={total} onSelect={go} />
    </div>
  );
};
