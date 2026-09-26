"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { BRAND_FOCUSABLE } from "@uaeaf/brand-ui";

import { gridImageSrc, padOrdinal, revealStep } from "@/lib/albums/photo-window";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import "./viewer.css";

export interface PhotoIndexGridProps {
  photos: readonly ViewerPhoto[];
  index: number;
  total: number;
  /** Called with the chosen photo; the viewer returns to the slider on it. */
  onSelect: (index: number) => void;
}

/**
 * The whole album at a glance: 8 columns on desktop, 4 on a phone, each cell
 * 3:2 and numbered.
 *
 * Cells appear one after another in reading order, 20ms apart, and the
 * stagger stops growing at the 30th cell (`revealStep`), which starts at
 * 580ms — inside Chapter 5 §5.7's 600ms ceiling — so the end of a long album
 * does not wait. The reveal is CSS inside a no-preference block, so a reader
 * who asked for less motion sees the grid at once.
 */
export const PhotoIndexGrid = ({ photos, index, total, onSelect }: PhotoIndexGridProps) => {
  const t = useTranslations("albums.viewer");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-[color:var(--surface-text-muted)]">{t("indexHint")}</p>
      <div className="av-grid" role="group" aria-label={t("indexLabel")}>
        {photos.map((photo, position) => (
          <button
            key={photo.id}
            type="button"
            className={`av-cell ${BRAND_FOCUSABLE}`}
            style={{ "--av-cell-step": revealStep(position) } as CSSProperties}
            aria-label={t("position", { current: position + 1, total })}
            aria-current={position === index ? "true" : undefined}
            onClick={() => onSelect(position)}
          >
            {/* The box is reserved by the cell's own 3:2 ratio, so the image
                arriving late moves nothing (CLS 0). */}
            {/* eslint-disable-next-line @next/next/no-img-element -- the CDN resizes; see photo-window.ts. */}
            <img
              className="av-cell__img"
              src={gridImageSrc(photo.src)}
              alt=""
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="av-cell__num text-body-sm font-bold" aria-hidden="true">
              {padOrdinal(position + 1, total)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
