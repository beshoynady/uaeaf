import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { BrandStreaks } from "@uaeaf/brand-ui";
import { heroScrim } from "@uaeaf/content/hero";
import { HeroControlsSlot } from "./hero-controls-slot";
import { HeroCtaRow } from "./hero-cta";
import { HeroEventBar } from "./hero-event-bar";
import { HeroPicture } from "./hero-picture";
import { HeroWords } from "./hero-words";
import { ScrollCue } from "@/components/ui/scroll-cue";
import { CONTAINER } from "@/components/ui/section";
import { HERO_MEASURE, HERO_STAGE, HERO_TEXT } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { HeroSlidePublic } from "@/lib/api/types";
import type { NextEvent, Playback } from "@/lib/pages/homepage";

/**
 * The homepage hero (`docs/plans/homepage-hero-design.md`,
 * `docs/engineering/how-hero-works.md`).
 *
 * ── One markup, two behaviours ────────────────────────────────────────────
 *
 * The server renders a scroll-snap track: every slide laid out, painted and
 * reachable by scroll, drag and keyboard with nothing running, which is the
 * owner's condition that the content is fully visible without JavaScript.
 * `HeroControls` then turns the same track into a stage and runs the
 * transition over it. The script changes no layout, so hydration moves
 * nothing and CLS stays at zero.
 *
 * ── Identity lives in the picture ─────────────────────────────────────────
 *
 * On review the owner asked for the federation's identity inside the
 * photograph, art-directed (`docs/content/hero-image-prompts.md`), and for
 * nothing over it that does not earn its place (2026-09-16). Over the picture
 * there is only the wash, the words, the editorial controls and the next-event
 * bar; the green of the progress line is the one mark of identity drawn in
 * code.
 *
 * ── Height and position ───────────────────────────────────────────────────
 *
 * The header plus the hero is the screen (ADR-0078). The hero sits directly
 * below the header, first on the page, and is not reorderable or hideable from
 * the dashboard (owner decision 2026-09-16).
 *
 * ── Video ─────────────────────────────────────────────────────────────────
 *
 * `heroSlides` carries a `VIDEO` branch, and it is deliberately not rendered:
 * the owner deferred it. The filter below keeps a `VIDEO` row from rendering
 * an empty frame.
 */

/**
 * The hero's own reading ground, darker on the side the text reads from and at
 * the foot, where the controls and the next-event bar stand (owner decisions
 * 2026-09-16).
 *
 * `HERO_SCRIM`, the shared one, is a flat wash for heroes whose text covers the
 * whole frame, and it stays untouched. Here:
 *
 * - **Below `md`** the whole frame takes a floor from 64% at the top to 74% by
 *   the middle, as `HERO_SCRIM` measured, deepening to 86% at the foot so the
 *   controls, which have no ground of their own, clear their contrast floors
 *   over a bright picture.
 * - **From `md`** two layers: one across the frame from the reading edge, and
 *   one up from the bottom. Gradients have no logical direction keyword, so
 *   the side is chosen by the document's direction (`ltr:` and `rtl:`).
 *
 * Written against `--color-surface-overlay` (black in all three themes), and
 * held to 4.5:1 for every glyph of every text in both languages and three
 * themes, measured.
 */
// The gradients themselves live in `@uaeaf/content/hero` (`heroScrim`), shared
// with the dashboard's preview; `.hero-story-scrim` in `motion.css` picks the
// narrow or the directional wide wash by breakpoint and direction.
const SCRIM_LAYERS = {
  "--hero-scrim-narrow": heroScrim("narrow", "rtl"),
  "--hero-scrim-wide-rtl": heroScrim("wide", "rtl"),
  "--hero-scrim-wide-ltr": heroScrim("wide", "ltr"),
} as CSSProperties;

/**
 * The opening (ADR-0087 D13): on the first slide only, the words arrive in the
 * order every other hero on the site arrives in (`HERO_STAGE`), by the settle
 * those heroes play. A class and a number on elements that were already here:
 * no element is added and the server sends nothing hidden (`.hero-open`,
 * `motion.css`).
 *
 * The blocks open and never the words. The lanes move the words, and two
 * animations on one `transform` leave only the last one running. A later slide
 * opens nothing: its words arrive on the lanes, and an opening there would run
 * again each time the slide became current.
 *
 * The picture has no step of its own. Its opening is the camera's slow move,
 * which starts as the page arrives (`hero-controls.tsx`).
 */
const opening = (index: number, stage: number, className: string) =>
  index === 0
    ? { className: `hero-open ${className}`, style: { "--hero-step": stage } as CSSProperties }
    : { className };

export interface HomeHeroProps {
  slides: readonly HeroSlidePublic[];
  locale: AppLocale;
  /** The next event, when the section carries one that is still to come. */
  nextEvent?: NextEvent | null;
  /** The editor's playback; autoplay at the default duration when absent. */
  playback?: Playback;
}

export const HomeHero = async ({
  slides,
  locale,
  nextEvent = null,
  playback = { autoplay: true, intervalMs: 7000 },
}: HomeHeroProps) => {
  const copy = await getTranslations({ locale, namespace: "HomeHero" });

  // A `VIDEO` row has no picture to paint. Filtering here rather than upstream
  // keeps the API honest about what the section holds.
  const shown = slides.filter((slide) => slide.mediaType === "IMAGE" && slide.desktop !== null);
  if (shown.length === 0) return null;

  const trackId = "home-hero-track";

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="hero-first-screen relative isolate flex w-full flex-col overflow-hidden bg-[color:var(--color-surface-base)]"
    >
      {/* The page's own name. The slide titles below are promotional and
          rotate, so none of them is the page's heading; this one is, and it is
          read rather than seen. */}
      <h1 id="home-hero-heading" className="sr-only">
        {copy("pageHeading")}
      </h1>

      {/* The stage: the track, and at its foot the controls and the next-event
          bar laid over the picture. `data-has-event` sets how much room the
          text keeps clear above them (`motion.css`). */}
      <div className="hero-stage relative flex flex-1 flex-col" data-has-event={nextEvent ? "" : undefined}>
        <ul
          id={trackId}
          // Focusable because a scrollable region must be reachable by keyboard
          // (WCAG 2.1.1); `role="group"` plus the carousel role-description is
          // the APG pattern for a set of slides that is not a tablist.
          tabIndex={0}
          role="group"
          aria-roledescription={copy("carousel")}
          aria-label={copy("pageHeading")}
          className="hero-track flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--a11y-focus-ring)]"
        >
          {shown.map((slide, index) => (
            <li
              key={slide.id}
              data-hero-slide=""
              // The first slide is the one in view in the server's HTML; the
              // controller owns the attribute afterwards.
              data-active={index === 0 ? "true" : "false"}
              aria-roledescription={copy("slide")}
              aria-label={copy("slideLabel", { current: index + 1, total: shown.length })}
              className="relative isolate grid overflow-clip"
            >
              {/* A layer, never a participant in the slide's height: the text
                  layer alone decides how tall a slide has to be, and the picture
                  covers whatever the first-screen rule makes of that. */}
              <div data-hero-media="" className="absolute inset-0 overflow-clip">
                <HeroPicture slide={slide} locale={locale} eager={index === 0} />
              </div>
              <div
                aria-hidden="true"
                data-hero-scrim=""
                className="hero-story-scrim pointer-events-none absolute inset-0 col-start-1 row-start-1"
                style={SCRIM_LAYERS}
              />

              {/* Positioned on purpose: a positioned element paints over an
                  unpositioned sibling whatever their DOM order, and without it
                  the wash lay over the text and swallowed its clicks (measured
                  with `elementFromPoint`). */}
              <div className="hero-stage-text relative col-start-1 row-start-1 flex items-end pt-24">
                <div className={CONTAINER}>
                  <div className={`${HERO_TEXT} ${HERO_MEASURE} flex flex-col gap-4`}>
                    {slide.eyebrow ? (
                      <p {...opening(index, HERO_STAGE.title, "text-overline text-[color:var(--color-text-on-brand)]")}>
                        <HeroWords text={slide.eyebrow[locale]} />
                      </p>
                    ) : null}
                    <h2 {...opening(index, HERO_STAGE.title, "text-h1 text-balance text-[color:var(--color-text-on-brand)]")}>
                      <HeroWords text={slide.title[locale]} />
                    </h2>
                    <p {...opening(index, HERO_STAGE.subtitle, "text-body text-[color:var(--color-text-on-brand)]")}>
                      <HeroWords text={slide.subtitle[locale]} />
                    </p>
                    {slide.primaryCta || slide.secondaryCta ? (
                      // The buttons move as one unit, in a window tall enough to
                      // keep their focus ring whole at rest.
                      <div {...opening(index, HERO_STAGE.card, "hero-word-mask hero-word-mask-roomy")}>
                        <div data-hero-word="" className="hero-word">
                          <HeroCtaRow
                            primary={slide.primaryCta}
                            secondary={slide.secondaryCta}
                            locale={locale}
                            externalHint={copy("opensInNewTab")}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* The identity motif over the photograph (ADR-0098 D4), in the stage's
            far corner, away from the words, which read from the start edge at
            the foot. A layer after the track and under the controls (`z-10`),
            so it paints over every slide without taking a pointer or a place in
            the reading order.

            Two elements because `[data-surface]` sets `position: relative`
            outside Tailwind's layer and would beat `absolute` on the same node:
            the outer one positions, the inner one publishes the ink ground's
            white so the strokes are white over the dark wash, as the words are. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <div data-surface="ink" className="h-full">
            <BrandStreaks placement="corner" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 md:gap-4">
          {/* The controls at the start of the text column, the scroll cue at the
              far end of the same row (ADR-0079). */}
          <div className={`${CONTAINER} flex min-h-11 items-center justify-between gap-4`}>
            <div className="min-w-0 flex-1">
              <HeroControlsSlot
                trackId={trackId}
                count={shown.length}
                playback={playback}
                announcements={shown.map(
                  (slide, index) =>
                    `${copy("slideLabel", { current: index + 1, total: shown.length })}: ${slide.title[locale]}`,
                )}
                labels={{
                  play: copy("play"),
                  pause: copy("pause"),
                  goTo: copy("goTo"),
                  progress: copy("progress"),
                }}
              />
            </div>
            <ScrollCue placement="inline" />
          </div>
          {nextEvent ? <HeroEventBar event={nextEvent} locale={locale} /> : <div className="h-[var(--space-4)]" />}
        </div>
      </div>
    </section>
  );
};
