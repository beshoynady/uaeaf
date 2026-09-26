"use client";

import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@uaeaf/brand-ui";
import { useAmbientMotion } from "@/lib/motion/use-ambient-motion";
import { altOf } from "@/lib/api/media";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { FeaturedAlbumDeckProps } from "./types";
import "./albums.css";

/**
 * Album covers as a turning coverflow (CMP-ALBUMDECK-001).
 *
 * Five slots: one cover facing the reader and four folded behind it towards
 * the inline end. Every fifteen seconds each cover has taken the front once.
 * The whole revolution is CSS; this component decides only whether it may
 * run.
 *
 * -- Why it may move at all ------------------------------------------------
 *
 * ADR-0099 D1 allows unprompted motion only while six conditions hold
 * together. Five are state, and `useAmbientMotion` owns all five: reduced
 * motion, off screen, hidden tab, pointer over the deck, focus inside it. Its
 * `running` is the only switch the stylesheet reads (`data-running`), so no
 * condition is re-implemented here. The sixth is the visible pause button
 * below (WCAG 2.2.2), whose name is the action it will perform.
 *
 * -- Fewer than five covers -------------------------------------------------
 *
 * The cycle is five slots' arithmetic, so it runs only with five. Fewer are
 * drawn at rest in their slots, and with nothing turning there is nothing to
 * pause: the dots and the button are not drawn.
 */

const SLOTS = 5;

/* Twice the 400px card, for a 2x screen; the phone draws it at half size, so
   the same file serves both. */
const COVER_WIDTH = 800;

const coverSrc = (url: string) =>
  isCloudinaryUrl(url) ? cloudinaryLoader({ src: url, width: COVER_WIDTH }) : url;

export const FeaturedAlbumDeck = ({ covers, locale, className }: FeaturedAlbumDeckProps) => {
  const t = useTranslations("albums.deck");
  const deck = useRef<HTMLDivElement>(null);
  const { running, paused, available, toggle, handlers } = useAmbientMotion(deck);

  const slots = covers.slice(0, SLOTS);
  const turns = slots.length === SLOTS;

  // The name says what pressing it will do. Under reduced motion nothing was
  // ever going to move, so it says that instead of offering to stop it.
  const buttonLabel = !available ? t("motionOff") : paused ? t("play") : t("pause");

  return (
    <div
      ref={deck}
      className={["album-deck", className].filter(Boolean).join(" ")}
      data-slots={slots.length}
      data-running={running}
      {...handlers}
    >
      <div className="album-deck__viewport">
        <ul className="album-deck__stage" aria-label={t("label")}>
          {/* Back to front, so the resting front cover is painted last. */}
          {[...slots.keys()].reverse().map((slot) => {
            const { id, photo } = slots[slot];
            return (
              <li key={id} className="album-deck__card" data-slot={slot}>
                <div className="album-deck__frame">
                  <Image
                    src={coverSrc(photo.file.url)}
                    alt={altOf(photo, locale)}
                    fill
                    sizes="400px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <span className="album-deck__shade" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      </div>

      {turns ? (
        <div className="album-deck__controls">
          {/* Which cover is in front is visible in the stage itself; the dots
              repeat it for the eye and carry nothing a screen reader lacks. */}
          <span className="album-deck__dots" aria-hidden="true">
            {slots.map(({ id }, slot) => (
              <span key={id} className="album-deck__dot" data-slot={slot} />
            ))}
          </span>
          <IconButton
            shape="circle"
            aria-label={buttonLabel}
            aria-disabled={available ? undefined : true}
            onClick={available ? toggle : undefined}
          >
            {available && !paused ? <PauseGlyph /> : <PlayGlyph />}
          </IconButton>
        </div>
      ) : null}
    </div>
  );
};

const PauseGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
    <rect x="7" y="5" width="3.5" height="14" rx="1" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
  </svg>
);

/* A play triangle points in the direction of travel, which is not the reading
   direction: media controls keep their physical orientation in RTL. */
const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5z" />
  </svg>
);
