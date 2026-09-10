import type { ReactNode } from "react";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { CONTAINER, REGISTER_CLASSES, type Register } from "./section";
import {
  HERO_COMPOSITION,
  HERO_MEASURE,
  HERO_MOTIF,
  HERO_TEXT,
  HERO_VIEWPORT,
} from "./surface";

/**
 * The hero every public listing page opens with.
 *
 * ── Composition ────────────────────────────────────────────────────────────
 *
 * `HERO_COMPOSITION` in `ui/surface` — the one composition every page that
 * opens with a hero now shares, contact included. Two columns at `md` and up,
 * stacked below it (Chapter 5 §5.10 Stacking, "most important first" — the
 * heading is first in the DOM either way), title block on the reading edge,
 * motif answering from the far side on the same baseline.
 *
 * The motif has a column of its own rather than sitting behind the text, and
 * that is a contrast decision, not a layout preference: artwork behind text
 * changes the measured ratio of every character it passes under, and Chapter
 * 6 puts WCAG AA above any aesthetic consideration. Two columns cannot
 * overlap at any width, so the ratio is the register's published one at every
 * breakpoint instead of something that has to be re-measured per viewport.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * The heading and subtitle enter along the ascent vector, staggered by
 * `--motion-ascent-stagger`. Chapter 5 §5.7 allows 40–80ms per step and caps
 * the total at 600ms; two elements at 60ms is 60ms of total stagger, well
 * inside it. The vector itself does not mirror under RTL (ADR-0059 §D7.1).
 *
 * ── The image that is not here ─────────────────────────────────────────────
 *
 * Every one of the twelve page records carries `heroImageId`, and the admin
 * panel offers a picker for it. It is not rendered, because it cannot be:
 * resolving a `mediaAssets` reference to a URL needs `GET /media-assets/:id`,
 * which upstream carries `@RequirePermission('mediaAssets', 'Read')` — there
 * is no public read of media at all. Rendering a broken image, or reaching
 * for a stand-in from the design-asset exports, would both be worse than
 * saying so. The gap is reported rather than papered over, and the hero is
 * typography-led in the meantime — which is what §3.34.2 prescribes for the
 * Quiet/Institutional pages regardless.
 */
export function PageHero({
  register,
  title,
  subtitle,
  breadcrumb,
  titleId,
  fillsFirstScreen = false,
}: {
  register: Register;
  title: string;
  /** `null` where the record has no subtitle. The element is dropped rather
   *  than rendered empty — an empty paragraph is a gap in the vertical rhythm
   *  that reads as a bug. */
  subtitle: string | null;
  breadcrumb?: ReactNode;
  titleId: string;
  /**
   * Take the whole first screen, header included.
   *
   * Off by default, and that default is a measured decision rather than
   * caution. A hero that owns the screen has to have something to fill it
   * with: the contact page's does — a photograph and four cards — and reads
   * as one composed opening. These eleven are typography-led by design
   * (§3.34.2 calls the Quiet/Institutional pages exactly that), so the same
   * rule turned an 804px band into a flat register field holding a title and
   * one line of subtitle, with roughly 550px of nothing. That is the dead
   * space the height rule was meant to remove, arriving through the rule
   * itself.
   *
   * So the standard is "the first screen is one composed unit", and the
   * height is how a hero achieves that when it has the material. Reported to
   * the owner rather than decided quietly: the flag exists so turning it on
   * for the other eleven is one edit once they carry hero imagery.
   */
  fillsFirstScreen?: boolean;
}) {
  const tone = REGISTER_CLASSES[register];

  return (
    <section
      aria-labelledby={titleId}
      data-register={register}
      data-testid="page-hero"
      className={`flex w-full flex-col justify-center overflow-hidden ${
        fillsFirstScreen ? HERO_VIEWPORT : ""
      } ${tone.surface}`}
    >
      <div className={`${CONTAINER} ${HERO_COMPOSITION} py-12 md:py-16 lg:py-20`}>
        <div className={HERO_TEXT}>
          {breadcrumb}
          <h1
            id={titleId}
            className="rise-in text-h1 text-balance"
            style={{ "--rise-index": 0 } as React.CSSProperties}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`rise-in mt-4 ${HERO_MEASURE} text-body-lg ${tone.muted}`}
              style={{ "--rise-index": 1 } as React.CSSProperties}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* The identity's own geometry, at the scale the composition can
            carry. `tone="inherit"` on a coloured register because Federation
            Green and Federation Red measure 1.15:1 against each other
            (ADR-0059 §D2) — the brand-coloured strokes would disappear into
            a green or red ground, and the black stroke into the black one. */}
        <UaeafMotif
          tone={register === "neutral" ? "brand" : "inherit"}
          className={`rise-in ${HERO_MOTIF} opacity-70`}
          style={{ "--rise-index": 2 } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
