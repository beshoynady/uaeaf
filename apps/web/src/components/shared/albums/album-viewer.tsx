"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BRAND_CONTAINER, Surface, TricolorDivider } from "@uaeaf/brand-ui";

import { useAmbientMotion } from "@/lib/motion/use-ambient-motion";
import { clampIndex, indexOfPhoto, shouldRequestMore, withPhotoParam } from "@/lib/albums/photo-window";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import { PhotoIndexGrid } from "./photo-index-grid";
import { PhotoSlider } from "./photo-slider";

import "./viewer.css";

export type { ViewerPhoto } from "@/lib/albums/photo-window";

export type AlbumView = "slider" | "index";

export interface AlbumViewerProps {
  /** The photos loaded so far, in album order, resolved to the reader's
   *  language. The viewer renders nothing for an empty album. */
  photos: readonly ViewerPhoto[];
  /** Photos in the whole album. Defaults to `photos.length`; larger while
   *  later pages are still to come. */
  total?: number;
  /** `?photo=<id>` from the request, so the server renders the right photo
   *  first. When omitted the viewer reads the address itself after mount. */
  initialPhotoId?: string | null;
  /** Called when the render window reaches the last loaded photo and the
   *  album has more. May be called again before the page arrives: the caller
   *  de-duplicates. */
  onRequestMore?: () => void;
  /** The section's anchor, for the hero's "play slideshow" link. */
  id?: string;
}

/**
 * One photo's dwell under autoplay, in milliseconds. `viewer.css` declares the
 * same value as `--av-dwell` for the Ken Burns, and a test reads both.
 */
export const DWELL_MS = 5200;

/**
 * The event a control elsewhere on the page dispatches to start the
 * slideshow — the hero's «تشغيل العرض». An event rather than shared state,
 * because the hero is a separate tree and a prop would have to be threaded
 * through the page for one button.
 */
export const ALBUM_VIEWER_PLAY_EVENT = "uaeaf:album-viewer-play";

export const requestAlbumSlideshow = (): void => {
  window.dispatchEvent(new Event(ALBUM_VIEWER_PLAY_EVENT));
};

const SliderIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="av-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <path d="M3 8v8M21 8v8" strokeLinecap="round" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="av-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="av-icon rtl:-scale-x-100" fill="currentColor">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="av-icon" fill="currentColor">
    <rect x="7" y="5.5" width="3.5" height="13" rx="1" />
    <rect x="13.5" y="5.5" width="3.5" height="13" rx="1" />
  </svg>
);

/**
 * «صور الألبوم»: the album's photos as a slideshow or as an index, on the ink
 * surface with its mesh.
 *
 * -- Autoplay, under ADR-0099 --------------------------------------------
 *
 * The slideshow never starts by itself. It runs only after the reader presses
 * play (here, or the hero's button through `requestAlbumSlideshow`), and then
 * only while `useAmbientMotion` says motion may run: the stage is on screen,
 * the tab is visible, the pointer is not on it, focus is not inside it, and
 * the reader has not asked for reduced motion. Pressing play and the helper
 * agreeing are two separate facts, kept apart so the button shows what the
 * reader chose while the helper decides whether anything moves right now.
 *
 * Under reduced motion there is no autoplay at all (ADR-0099 D1.4). The
 * button stays, focusable, and says why it does nothing — a control that
 * vanished would leave the hero's play button pointing at nothing.
 *
 * -- One index, one address ----------------------------------------------
 *
 * The slider, the grid, autoplay and the deep link move one index, owned here.
 * Every move writes `?photo=<id>` with `replaceState`: the address can be
 * shared at any moment, and the back button still leaves the album in one
 * press.
 */
export const AlbumViewer = ({ photos, total, initialPhotoId, onRequestMore, id }: AlbumViewerProps) => {
  const t = useTranslations("albums.viewer");
  const count = photos.length;
  const albumTotal = Math.max(total ?? count, count);

  const [index, setIndex] = useState(() => Math.max(0, indexOfPhoto(photos, initialPhotoId)));
  const [view, setView] = useState<AlbumView>("slider");
  const [playing, setPlaying] = useState(false);
  // Set when the reader picks a cell in the grid, so the slider that replaces
  // it takes focus and the keyboard lands on the photo they chose.
  const [focusStage, setFocusStage] = useState(false);
  // Remounts the slider for a placement that is not a move — the address read
  // after hydration — so it appears on the photo rather than sliding there.
  const [placement, setPlacement] = useState(0);

  const motionRegion = useRef<HTMLDivElement>(null);
  const motion = useAmbientMotion(motionRegion);
  const active = playing && motion.running && view === "slider";

  const navigate = useCallback(
    (next: number) => {
      const target = clampIndex(next, count);
      setIndex(target);
      const photo = photos[target];
      if (photo) window.history.replaceState(window.history.state, "", withPhotoParam(window.location.href, photo.id));
    },
    [count, photos],
  );

  // The address, read once after mount when the server did not supply it.
  useEffect(() => {
    if (initialPhotoId !== undefined) return;
    const found = indexOfPhoto(photos, new URLSearchParams(window.location.search).get("photo"));
    if (found > 0) {
      // A state update from a read of the address, once, after hydration:
      // the server rendered without it, so there is nothing to derive from.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndex(found);
      setPlacement((value) => value + 1);
    }
    // Once: a later change of `photos` is a new page of the same album, not a
    // new arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoplay. A timeout per photo rather than an interval, so a manual move
  // restarts the dwell and the reader never gets a photo for half its time.
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      if (index >= count - 1) {
        // The last photo ends the show: the reader is told it is over by the
        // button returning to "play", not by being sent back to the start.
        setPlaying(false);
        return;
      }
      navigate(index + 1);
    }, DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [active, index, count, navigate]);

  useEffect(() => {
    if (onRequestMore && shouldRequestMore(index, count, albumTotal)) onRequestMore();
  }, [index, count, albumTotal, onRequestMore]);

  const start = useCallback(() => {
    if (!motion.available) return;
    setView("slider");
    // Pressed on the last photo, play means "show it again".
    setIndex((current) => (current >= count - 1 ? 0 : current));
    setPlaying(true);
  }, [motion.available, count]);

  useEffect(() => {
    window.addEventListener(ALBUM_VIEWER_PLAY_EVENT, start);
    return () => window.removeEventListener(ALBUM_VIEWER_PLAY_EVENT, start);
  }, [start]);

  const togglePlay = () => {
    if (playing) setPlaying(false);
    else start();
  };

  const showView = (next: AlbumView) => {
    setView(next);
    setFocusStage(false);
    // The index is a place to choose from, not a show to watch.
    if (next === "index") setPlaying(false);
  };

  const pickFromGrid = (next: number) => {
    // Blurred before the grid unmounts: a focused element removed from the
    // page does not reliably fire `blur`, and the motion helper counts focus
    // in and out — a lost `blur` would hold autoplay stopped for good.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    navigate(next);
    setFocusStage(true);
    setView("slider");
  };

  if (count === 0) return null;

  const playLabel = !motion.available ? t("playUnavailable") : playing ? t("pause") : t("play");

  return (
    <Surface kind="ink" mesh id={id} className="av-root">
      <div className={`${BRAND_CONTAINER} flex flex-col gap-6 py-12 lg:gap-8 lg:py-16`}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="av-heading flex items-center gap-4">
            <h2 className="text-h2 text-[color:var(--surface-text)]">{t("heading")}</h2>
            <TricolorDivider />
          </div>

          <div className="flex items-center gap-3 max-lg:w-full max-lg:justify-between">
            <div className="av-toggle" role="group" aria-label={t("viewSwitch")}>
              <button
                type="button"
                className="av-toggle__option text-body-sm font-medium"
                aria-pressed={view === "slider"}
                onClick={() => showView("slider")}
              >
                <SliderIcon />
                {t("viewSlider")}
              </button>
              <button
                type="button"
                className="av-toggle__option text-body-sm font-medium"
                aria-pressed={view === "index"}
                onClick={() => showView("index")}
              >
                <GridIcon />
                {t("viewIndex")}
              </button>
            </div>

            {/* ADR-0099 D1.1: a visible control, named for the action it
                performs, showing the reader's choice. */}
            <button
              type="button"
              className="av-play"
              aria-label={playLabel}
              title={playLabel}
              aria-disabled={motion.available ? undefined : true}
              onClick={togglePlay}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
        </div>

        {/* The region the motion helper watches: on screen, hovered, focused.
            It stays mounted across both views so its observer keeps watching
            the same element. */}
        <div
          ref={motionRegion}
          className="av-region"
          data-held={playing && !motion.running ? "" : undefined}
          onPointerEnter={motion.handlers.onPointerEnter}
          onPointerLeave={motion.handlers.onPointerLeave}
          onFocus={motion.handlers.onFocus}
          onBlur={motion.handlers.onBlur}
        >
          {view === "slider" ? (
            <PhotoSlider
              key={placement}
              photos={photos}
              index={index}
              total={albumTotal}
              onIndexChange={navigate}
              playing={playing}
              autoFocus={focusStage}
            />
          ) : (
            <PhotoIndexGrid photos={photos} index={index} total={albumTotal} onSelect={pickFromGrid} />
          )}
        </div>
      </div>
    </Surface>
  );
};
