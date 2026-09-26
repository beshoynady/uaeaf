"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { BRAND_FOCUSABLE } from "@uaeaf/brand-ui";

import { thumbImageSrc } from "@/lib/albums/photo-window";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import "./viewer.css";

export interface FilmstripProps {
  photos: readonly ViewerPhoto[];
  index: number;
  total: number;
  onSelect: (index: number) => void;
}

/**
 * Every photo as a thumbnail, the current one outlined in green and kept in
 * the middle of the strip.
 *
 * -- Centring without a direction sign ------------------------------------
 *
 * The strip is scrolled by the physical distance between the current
 * thumbnail's centre and the strip's centre, both read from
 * `getBoundingClientRect`. A physical delta needs no RTL correction: in an RTL
 * overflow container `scrollBy` works in the same signed space the rectangles
 * are measured in. Setting `scrollLeft` from an offset would not, because
 * `scrollLeft` runs negative in Arabic.
 *
 * `scrollIntoView` is not used: it scrolls every scrollable ancestor too, and
 * autoplay would then drag the page to the strip every five seconds.
 */
export const Filmstrip = ({ photos, index, total, onSelect }: FilmstripProps) => {
  const t = useTranslations("albums.viewer");
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = strip.current;
    const current = node?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!node || !current) return;
    const box = node.getBoundingClientRect();
    const thumb = current.getBoundingClientRect();
    const delta = thumb.left + thumb.width / 2 - (box.left + box.width / 2);
    if (Math.abs(delta) < 1 || typeof node.scrollBy !== "function") return;
    // An explicit `behavior` overrides the stylesheet, and Chromium does not
    // soften it for reduced motion, so the preference is asked here.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: delta, behavior: reduce ? "auto" : "smooth" });
  }, [index]);

  return (
    <div ref={strip} className="av-strip" role="group" aria-label={t("thumbnails")}>
      {photos.map((photo, position) => (
        <button
          key={photo.id}
          type="button"
          className={`av-thumb ${BRAND_FOCUSABLE}`}
          aria-label={t("position", { current: position + 1, total })}
          aria-current={position === index ? "true" : undefined}
          onClick={() => onSelect(position)}
        >
          {/* Decorative: the button's label names the photo, and repeating the
              alt text on every thumbnail would read the album twice. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the CDN resizes; see photo-window.ts. */}
          <img
            className="av-thumb__img"
            src={thumbImageSrc(photo.src)}
            alt=""
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
};
