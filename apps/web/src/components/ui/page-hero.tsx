import type { ReactNode } from "react";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { CONTAINER, REGISTER_CLASSES, type Register } from "./section";

/**
 * The hero every public listing page opens with.
 *
 * ── Composition ────────────────────────────────────────────────────────────
 *
 * Two columns at `md` and up, stacked below it (Chapter 5 §5.10 Stacking,
 * "most important first" — the heading is first in the DOM either way). The
 * motif has a column of its own rather than sitting behind the text, and that
 * is a contrast decision, not a layout preference: artwork behind text
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
}: {
  register: Register;
  title: string;
  /** `null` where the record has no subtitle. The element is dropped rather
   *  than rendered empty — an empty paragraph is a gap in the vertical rhythm
   *  that reads as a bug. */
  subtitle: string | null;
  breadcrumb?: ReactNode;
  titleId: string;
}) {
  const tone = REGISTER_CLASSES[register];

  return (
    <section
      aria-labelledby={titleId}
      data-register={register}
      data-testid="page-hero"
      className={`w-full overflow-hidden ${tone.surface}`}
    >
      <div className={`${CONTAINER} grid items-center gap-8 py-12 md:grid-cols-[1fr_auto] md:py-16 lg:py-20`}>
        <div className="min-w-0">
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
              className={`rise-in mt-4 max-w-[62ch] text-body-lg ${tone.muted}`}
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
          className="rise-in h-20 w-full self-end opacity-70 md:h-32 md:w-32 md:self-center"
          style={{ "--rise-index": 2 } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
