"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stagger, useAnimate, useReducedMotion } from "motion/react";
import type { AnimationPlaybackControls } from "motion/react";
import {
  HERO_TIMING,
  LANE_COUNT,
  laneBand,
  laneDelay,
  laneStart,
  navigationFromKey,
  navigationFromSwipe,
  transitionSeconds,
} from "./hero-stage";
import type { Direction } from "./hero-stage";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

/**
 * The hero's stage: the transition between slides, automatic advance, and the
 * controls WCAG 2.2.2 then requires.
 *
 * ── Why this never reaches the server ─────────────────────────────────────
 *
 * Without JavaScript the hero is a scroll-snap track and every slide is there
 * to read. This module arrives with `ssr: false` (`hero-controls-slot.tsx`),
 * and only then turns the track into a stage (`data-enhanced`, `motion.css`):
 * the slides become layers in one cell. Nothing moves when that happens,
 * because the slide in view already filled the frame.
 *
 * ── The transition ─────────────────────────────────────────────────────────
 *
 * The lanes (owner decision 2026-09-17, ADR-0076 D8.3), in every build: the
 * next picture runs in on six horizontal lanes in the reading direction. The
 * current words leave just before the picture settles and the new ones rise
 * right after it, so the frame is never without words for more than a moment.
 *
 * ── What a reader controls ───────────────────────────────────────────────
 *
 * - The stop button freezes everything where it stands, a transition half way
 *   through included, and play continues from there.
 * - Hover, focus and touch hold the automatic advance only.
 * - The numbers, the arrow keys on the track and a horizontal swipe step
 *   manually, faster; only these are announced, politely.
 * - Reduced motion: no automatic advance, and a step swaps the slides at once.
 */

export interface HeroControlsProps {
  trackId: string;
  count: number;
  /** The editor's playback (HERO section settings): whether slides advance on
   *  their own, and each slide's whole time on screen, transition included. */
  playback: { autoplay: boolean; intervalMs: number };
  /** "Slide 2 of 3: <title>", one per slide, for the polite announcement. */
  announcements: readonly string[];
  labels: {
    play: string;
    pause: string;
    goTo: string;
    progress: string;
  };
}

const EASE_OUT: [number, number, number, number] = [0.4, 0, 1, 1];
const EASE_IN: [number, number, number, number] = [0, 0, 0.2, 1];
/** A soft settle: a quick start and a long, gentle landing. */
const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** A total stagger spread over however many words there are, within Chapter 5
 *  §5.7's 60ms a step. */
const stepFor = (count: number, totalS: number) =>
  count > 1 ? Math.min(0.06, totalS / (count - 1)) : 0;

const HIDDEN = "translateY(140%)";
const AT_REST = "translateY(0%)";

const pad = (n: number) => String(n).padStart(2, "0");

export const HeroControls = ({
  trackId,
  count,
  playback,
  announcements,
  labels,
}: HeroControlsProps) => {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [index, setIndex] = useState(0);
  // Autoplay switched off in the dashboard starts the hero stopped; the reader
  // can still start it, and still step through by hand.
  const [playing, setPlaying] = useState(playback.autoplay);
  const [suspended, setSuspended] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [progressNow, setProgressNow] = useState(0);

  const indexRef = useRef(0);
  const playingRef = useRef(playback.autoplay);
  const suspendedRef = useRef(false);
  const reducedRef = useRef(Boolean(reduced));
  const busy = useRef(false);
  /** The transition and the camera's slow move: what the stop button freezes. */
  const running = useRef<AnimationPlaybackControls[]>([]);
  /** The dwell, drawn by the current slide's line; its end starts the next step. */
  const progress = useRef<AnimationPlaybackControls | null>(null);
  const kenBurns = useRef<Map<number, AnimationPlaybackControls>>(new Map());
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  // Mirrored into refs after each render, for the asynchronous transition to
  // read the current value rather than the one its closure was created with.
  useEffect(() => {
    playingRef.current = playing;
    suspendedRef.current = suspended;
    reducedRef.current = Boolean(reduced);
  }, [playing, suspended, reduced]);

  const track = useCallback(() => document.getElementById(trackId), [trackId]);
  const slides = useCallback(
    () =>
      Array.from(
        track()?.querySelectorAll<HTMLElement>("[data-hero-slide]") ?? [],
      ),
    [track],
  );
  const direction = useCallback(
    (): Direction =>
      getComputedStyle(track() ?? document.documentElement).direction === "rtl"
        ? "rtl"
        : "ltr",
    [track],
  );

  /** Ask for a slide's picture now, so it is decoded before its turn. */
  const warm = useCallback(
    (at: number) => {
      const all = slides();
      const img =
        all[((at % all.length) + all.length) % all.length]?.querySelector(
          "img",
        );
      if (img && img.loading === "lazy") img.loading = "eager";
    },
    [slides],
  );

  /** Whether the slide's picture is decoded, waiting at most the token's time.
   *  A transition never shows a picture that is still arriving. */
  const decoded = useCallback(async (slide: HTMLElement) => {
    const img = slide.querySelector("img");
    if (!img) return true;
    if (img.loading === "lazy") img.loading = "eager";
    try {
      await Promise.race([
        img.decode(),
        new Promise((_, reject) =>
          window.setTimeout(
            () => reject(new Error("decode timeout")),
            HERO_TIMING.decodeTimeoutMs,
          ),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const startKenBurns = useCallback(
    (at: number, delay: number) => {
      if (reducedRef.current) return null;
      const layer = slides()[at]?.querySelector<HTMLElement>(
        "[data-hero-ken-burns]",
      );
      if (!layer) return null;
      kenBurns.current.get(at)?.stop();
      const phone = window.matchMedia("(max-width: 640px)").matches;
      const to = phone
        ? HERO_TIMING.kenBurns.mobile
        : HERO_TIMING.kenBurns.desktop;
      const controls = animate(
        layer,
        { transform: ["scale(1)", `scale(${to})`] },
        { duration: playback.intervalMs / 1000, delay, ease: "linear" },
      );
      kenBurns.current.set(at, controls);
      return controls;
    },
    [animate, slides, playback.intervalMs],
  );

  const stopKenBurns = useCallback(
    (at: number) => {
      kenBurns.current.get(at)?.stop();
      kenBurns.current.delete(at);
      const layer = slides()[at]?.querySelector<HTMLElement>(
        "[data-hero-ken-burns]",
      );
      if (layer) layer.style.transform = "";
    },
    [slides],
  );

  const clearProgress = useCallback(() => {
    const current = progress.current;
    progress.current = null;
    current?.stop();
    for (const fill of fills.current)
      if (fill) fill.style.transform = "scaleX(0)";
    setProgressNow(0);
  }, []);

  // `goTo` and `startDwell` call each other; the ref breaks the cycle without
  // letting either run a stale copy of the other.
  const goToRef = useRef<(target: number, manual: boolean) => Promise<void>>(
    async () => {},
  );

  const startDwell = useCallback(
    (at: number) => {
      clearProgress();
      const fill = fills.current[at];
      if (!fill) return;
      const controls = animate(
        fill,
        { transform: ["scaleX(0)", "scaleX(1)"] },
        {
          duration: playback.intervalMs / 1000 - transitionSeconds(),
          ease: "linear",
        },
      );
      progress.current = controls;
      if (!playingRef.current || suspendedRef.current) controls.pause();
      void controls.finished.then(() => {
        if (progress.current !== controls) return;
        progress.current = null;
        void goToRef.current(at + 1, false);
      });
    },
    [animate, clearProgress, playback.intervalMs],
  );

  const goTo = useCallback(
    async (target: number, manual: boolean) => {
      const all = slides();
      if (all.length < 2 || busy.current) return;
      const from = indexRef.current;
      const next = ((target % all.length) + all.length) % all.length;
      if (next === from) return;

      busy.current = true;
      clearProgress();
      if (manual) setAnnouncement(announcements[next] ?? "");

      const incoming = all[next];
      const outgoing = all[from];

      if (!(await decoded(incoming)) && !manual) {
        // Put off, not skipped: the same step is tried again shortly, and the
        // reader never sees a picture arrive half drawn.
        busy.current = false;
        window.setTimeout(() => void goToRef.current(next, false), 1000);
        return;
      }

      const swap = () => {
        outgoing.dataset.active = "false";
        incoming.dataset.active = "true";
        indexRef.current = next;
        setIndex(next);
        warm(next + 1);
      };

      if (reducedRef.current) {
        swap();
        stopKenBurns(from);
        const camera = startKenBurns(next, 0);
        running.current = camera ? [camera] : [];
        busy.current = false;
        if (playingRef.current) startDwell(next);
        return;
      }

      const timing = HERO_TIMING.lanes;
      const factor = manual ? HERO_TIMING.manualFactor : 1;
      const s = (seconds: number) => seconds * factor;
      const outWords = Array.from(
        outgoing.querySelectorAll<HTMLElement>("[data-hero-word]"),
      );
      const inWords = Array.from(
        incoming.querySelectorAll<HTMLElement>("[data-hero-word]"),
      );
      for (const word of inWords) word.style.transform = HIDDEN;

      const words: AnimationPlaybackControls[] = [
        animate(
          outWords,
          { transform: [AT_REST, HIDDEN] },
          {
            duration: s(timing.textOut.durationS),
            ease: EASE_OUT,
            delay: stagger(
              s(stepFor(outWords.length, timing.textOut.staggerTotalS)),
              {
                startDelay: s(timing.textOut.startS),
              },
            ),
          },
        ),
        animate(
          inWords,
          { transform: [HIDDEN, AT_REST] },
          {
            duration: s(timing.textIn.durationS),
            ease: EASE_IN,
            delay: stagger(
              s(stepFor(inWords.length, timing.textIn.staggerTotalS)),
              {
                startDelay: s(timing.textIn.startS),
              },
            ),
          },
        ),
      ];

      // Six copies of the arriving picture run in from the side the line
      // starts from, top lane first, each moving inside a still band that
      // clips it (`laneBand`). The arriving slide's own picture stays hidden
      // beneath them until they have landed, then takes over pixel for pixel
      // and the copies go.
      //
      // Only the picture is copied. The reading wash is the same on every
      // slide, so the arriving slide's wash stays on above the lanes and the
      // leaving slide's is hidden for the transition: one wash over the whole
      // frame throughout, drawn once instead of six times.
      const { image } = HERO_TIMING.lanes;
      const dir = direction();
      const media = incoming.querySelector<HTMLElement>("[data-hero-media]");
      const outgoingWash = outgoing.querySelector<HTMLElement>("[data-hero-scrim]");
      const frameHeight = incoming.getBoundingClientRect().height;
      const lanes = document.createElement("div");
      lanes.className = "hero-lanes";
      lanes.setAttribute("aria-hidden", "true");
      const strips: HTMLElement[] = [];
      for (let lane = 0; lane < LANE_COUNT; lane += 1) {
        const band = laneBand(lane, frameHeight);
        const clip = document.createElement("div");
        clip.style.top = `${band.top}px`;
        clip.style.height = `${band.height}px`;
        const strip = document.createElement("div");
        strip.style.top = `${-band.top}px`;
        strip.style.height = `${frameHeight}px`;
        strip.style.transform = laneStart(dir);
        if (media) strip.append(media.cloneNode(true));
        for (const img of strip.querySelectorAll("img"))
          img.loading = "eager";
        clip.append(strip);
        strips.push(strip);
        lanes.append(clip);
      }
      if (media) {
        media.style.visibility = "hidden";
        media.after(lanes);
      }
      if (outgoingWash) outgoingWash.style.visibility = "hidden";
      outgoing.dataset.leaving = "true";
      swap();
      const pictures = strips.map((strip, lane) =>
        animate(
          strip,
          { transform: [laneStart(dir), "translateX(0%)"] },
          {
            duration: s(image.durationS),
            delay: s(laneDelay(lane)),
            ease: EASE_SETTLE,
          },
        ),
      );
      const finish = () => {
        if (media) media.style.visibility = "";
        if (outgoingWash) outgoingWash.style.visibility = "";
        lanes.remove();
      };

      running.current = [...pictures, ...words];
      // A stopped hero holds its automatic advance, not a step the reader asked
      // for: frozen there, the lanes stayed over the frame and the picture never
      // arrived (home-hero.spec.ts). The stop button still freezes a transition
      // already running when it is pressed.
      if (!playingRef.current && !manual) for (const step of running.current) step.pause();

      await Promise.all(running.current.map((step) => step.finished));

      finish();
      delete outgoing.dataset.leaving;
      for (const word of [...outWords, ...inWords]) word.style.transform = "";
      stopKenBurns(from);
      const camera = startKenBurns(next, 0);
      running.current = camera ? [camera] : [];
      if (!playingRef.current) camera?.pause();
      busy.current = false;
      if (playingRef.current) startDwell(next);
    },
    [
      animate,
      announcements,
      clearProgress,
      decoded,
      direction,
      slides,
      startDwell,
      startKenBurns,
      stopKenBurns,
      warm,
    ],
  );

  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  /** Turn the track into a stage, on the slide the reader is already on. */
  useEffect(() => {
    const trackElement = track();
    const all = slides();
    if (!trackElement || all.length === 0) return;

    const edge = trackElement.getBoundingClientRect();
    const at = Math.max(
      0,
      all.findIndex(
        (slide) => Math.abs(slide.getBoundingClientRect().left - edge.left) < 2,
      ),
    );
    all.forEach((slide, position) => {
      slide.dataset.active = position === at ? "true" : "false";
    });
    trackElement.dataset.enhanced = "";
    indexRef.current = at;
    warm(at + 1);

    if (!reducedRef.current) {
      // The first arrival: the picture is already painted and stays put, so the
      // Largest Contentful Paint is not delayed; only the words settle, a short
      // way along the ascent and without hiding.
      const words = all[at].querySelectorAll<HTMLElement>("[data-hero-word]");
      void animate(
        words,
        { transform: ["translate(-12px, 12px)", "translate(0px, 0px)"] },
        {
          duration: 0.4,
          ease: EASE_IN,
          delay: stagger(stepFor(words.length, 0.36)),
        },
      );
      const camera = startKenBurns(at, 0);
      running.current = camera ? [camera] : [];
    }

    // The reader may have scrolled the track before this arrived; the numbers
    // follow the slide they are on. A state update from a DOM read, once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(at);

    return () => {
      delete trackElement.dataset.enhanced;
      delete trackElement.dataset.transition;
      for (const controls of running.current) controls.stop();
      progress.current?.stop();
    };
    // Mount only: the stage is built once per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Stop freezes everything; hover, focus and touch hold only the dwell.
   *  Reduced motion never starts the advance: Chapter 5 §5.8, and ADR-0043's
   *  "MUST stop entirely, not merely slow". */
  const autoplay = playing && !reduced;
  useEffect(() => {
    for (const controls of running.current) {
      if (playing) controls.play();
      else controls.pause();
    }
    if (!autoplay || suspended) {
      progress.current?.pause();
    } else if (progress.current) {
      progress.current.play();
    } else if (!busy.current && count > 1) {
      startDwell(indexRef.current);
    }
  }, [playing, autoplay, suspended, count, startDwell]);

  /** The progress value for assistive technology, in whole percent. */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = progress.current;
      setProgressNow(
        current && current.duration > 0
          ? Math.min(100, Math.round((100 * current.time) / current.duration))
          : 0,
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  /** Swipe (touch and pen; a mouse drag is text selection) and the arrow keys. */
  useEffect(() => {
    const element = track();
    if (!element) return;
    let start: { x: number; y: number } | null = null;

    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.pointerType === "mouse") return;
      start = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      if (!start) return;
      const step = navigationFromSwipe(
        event.clientX - start.x,
        event.clientY - start.y,
        direction(),
      );
      start = null;
      if (step !== 0) void goToRef.current(indexRef.current + step, true);
    };
    const cancel = () => {
      start = null;
    };
    const key = (event: KeyboardEvent) => {
      if (event.target !== element) return;
      const step = navigationFromKey(event.key, direction());
      if (step === 0) return;
      event.preventDefault();
      void goToRef.current(indexRef.current + step, true);
    };

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("keydown", key);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", cancel);
      element.removeEventListener("keydown", key);
    };
  }, [track, direction]);

  /** Pointer, focus and touch hold the advance; so does leaving the tab. */
  useEffect(() => {
    const element = track();
    if (!element) return;
    const hold = () => setSuspended(true);
    const release = () => setSuspended(false);
    const onVisibility = () => setSuspended(document.hidden);

    element.addEventListener("pointerenter", hold);
    element.addEventListener("pointerleave", release);
    element.addEventListener("focusin", hold);
    element.addEventListener("focusout", release);
    element.addEventListener("touchstart", hold, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      element.removeEventListener("pointerenter", hold);
      element.removeEventListener("pointerleave", release);
      element.removeEventListener("focusin", hold);
      element.removeEventListener("focusout", release);
      element.removeEventListener("touchstart", hold);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [track]);

  if (count < 2) return null;

  /*
   * Editorial, with no ground of their own: no pill, no circles. They stand on
   * the hero's own wash at the foot of the text column and are held to 4.5:1
   * (numbers, icon) and 3:1 (lines) by measurement, in both languages and three
   * themes. White is `--color-text-on-brand` in every theme because the ground
   * beneath is a photograph under a black wash in every theme.
   *
   * States: rest; hover lifts a dimmed number to full strength and active dims
   * the mark; focus-visible is the shared ring; selected is `aria-current`,
   * shown by the number at full strength and the filling line, never by colour
   * alone. Disabled and loading do not apply: a slide is always reachable.
   */
  const mark = `${TRANSITION} rounded-[var(--radius-sm)] text-[color:var(--color-text-on-brand)] hover:opacity-100 active:opacity-80`;

  return (
    <div ref={scope} className="pointer-events-none w-full">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
        {/* The stop control. Always visible: WCAG 2.2.2 asks for a mechanism,
              and one a reader cannot find is not one. */}
        <button
          type="button"
          className={`${mark} ${FOCUS} inline-flex size-11 shrink-0 items-center justify-center`}
          aria-label={playing ? labels.pause : labels.play}
          aria-pressed={!playing}
          aria-controls={trackId}
          onClick={() => setPlaying((was) => !was)}
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            className="size-4 fill-current"
          >
            {playing ? (
              <path d="M4 2h3v12H4zM9 2h3v12H9z" />
            ) : (
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5z" />
            )}
          </svg>
        </button>

        <ol className="flex items-center gap-1 md:gap-3">
          {Array.from({ length: count }, (_, slide) => {
            const current = slide === index;
            return (
              <li key={slide}>
                <button
                  type="button"
                  className={`${mark} ${FOCUS} group flex min-h-11 min-w-11 flex-col items-start justify-center gap-1.5 px-1`}
                  aria-label={`${labels.goTo} ${slide + 1}`}
                  aria-current={current ? "true" : undefined}
                  aria-controls={trackId}
                  onClick={() => void goTo(slide, true)}
                >
                  {/* The number: on a phone only the current one, so five
                        slides and the stop control fit a 328px column. */}
                  <span
                    aria-hidden="true"
                    className={`text-caption font-bold tabular-nums ${
                      current
                        ? ""
                        : "opacity-75 group-hover:opacity-100 group-active:opacity-100 max-md:hidden"
                    }`}
                  >
                    {pad(slide + 1)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative block h-0.5 w-8 overflow-hidden bg-[color-mix(in_srgb,var(--color-text-on-brand)_45%,transparent)] md:w-14"
                  >
                    {/* The dwell, filling in the reading direction in the
                          federation's green. */}
                    <span
                      ref={(node) => {
                        fills.current[slide] = node;
                      }}
                      className="absolute inset-0 bg-[color:var(--color-brand-primary)] ltr:origin-left rtl:origin-right"
                      style={{ transform: "scaleX(0)" }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Not a live region: a value that changes twice a second would be read
              aloud without end. It is there for anyone who asks for it. */}
        <span
          role="progressbar"
          aria-label={labels.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressNow}
          className="sr-only"
        />
      </div>
    </div>
  );
};
