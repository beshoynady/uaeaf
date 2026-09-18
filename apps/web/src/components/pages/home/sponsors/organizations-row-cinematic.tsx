"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { CARD } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { OrganizationCardPublic } from "@/lib/api/types";
import { CARD_WIDTH } from "./organization-card";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";

/**
 * The cinematic organisation rows — an exploration (2026-09-18), not the
 * approved row. `organizations-motion.ts` decides which one the page draws,
 * and the approved one is the default.
 *
 * ── The idea ──────────────────────────────────────────────────────────────
 *
 * The two sections describe opposite directions of belonging, and the
 * approved row gives them the same gesture. Partners are organisations that
 * come *alongside* the federation: lateral, mutual, level. Memberships are
 * bodies the federation has *joined*: it is the smaller element, seated
 * inside a larger frame. ADR-0037 forbids merging the two concepts; drawing
 * them with one entrance says they are one concept anyway.
 *
 * **Partners — the lane draw.** Each card arrives along the reading axis from
 * its own side, alternating, overshoots slightly and squares up onto one
 * baseline: a field stepping to the start line. The motion says *these came
 * from different places*; the rest state says *they stand level*. The sign
 * follows the reading direction, as the sponsor strip's does.
 *
 * **Memberships — the seating.** No lateral travel at all. Each card begins
 * a little oversized and unresolved and settles to true size, in fixed order
 * from the inline start, the way a plate is seated into a frame. Admission,
 * not arrival: the body was always there; you are seeing it in its place.
 *
 * ── Why this draws its own card ───────────────────────────────────────────
 *
 * `OrganizationCard` *is* the `<li>`. Wrapping it would nest one list item in
 * another, and a wrapper at `display: contents` generates no box, so a
 * transform on it does nothing. So the motion has to be on the list item
 * itself — and the approved card is not modified to allow that. The same
 * classes and the same two children are composed here instead, which is the
 * duplication this exploration pays for keeping the approved row untouched.
 *
 * ── What is never traded away ─────────────────────────────────────────────
 *
 * The aesthetics here are free of the design system. These are not:
 *
 * - `transform` and `opacity` only, so the compositor does the work and no
 *   frame costs layout (ADR-0009). A transform cannot shift the page, so the
 *   row's geometry is identical with the motion and without it.
 * - The content is complete and readable before any of this runs: the row is
 *   plain markup until the component has mounted, so a reader whose script
 *   never arrives gets the row rather than an empty space where `opacity: 0`
 *   is waiting. That is what `useMounted` is for.
 * - Reduced motion stops this completely. The root `MotionConfig` is
 *   `reducedMotion="user"`, which skips transform animations but still runs
 *   opacity ones; a fade is not a stop, so this asks the preference as well
 *   and draws the plain row.
 * - Nothing flashes: each card animates once, on entering the view.
 * - The markup, the reading order and the accessible names are the approved
 *   row's. Nothing is re-ordered, hidden or given a role.
 */

/** How far a partner card starts outside its lane. */
const LANE_TRAVEL = 64;

interface RowProps {
  items: readonly OrganizationCardPublic[];
  locale: AppLocale;
  className: string;
}

/**
 * Whether this row should animate at all, decided once, at mount.
 *
 * Three ways it answers no, and each is a limit rather than a taste:
 *
 * 1. **Not mounted yet.** The row is plain markup until the component has
 *    mounted, so a reader whose script never arrives gets the row rather than
 *    an empty space where `opacity: 0` is waiting for it.
 * 2. **The reader asked for less motion.** The root `MotionConfig` is
 *    `reducedMotion="user"`, which skips transform animations but still runs
 *    opacity ones — a fade is not a complete stop. A complete static
 *    alternative means animating nothing, so this asks as well.
 * 3. **The row is already on screen.** Measured, and this is the one that
 *    matters most: `whileInView` only ever fires when the observer sees the
 *    element cross into view. A viewport that arrives somewhere else —
 *    scroll restored on reload, an in-page link, a browser Find, a screen
 *    reader moving its own cursor — never produces that crossing, and a card
 *    whose resting state was `opacity: 0` then stays invisible for good.
 *    Measured on 2026-09-18: jumping to the foot of the page left four of
 *    eight cards at `opacity: 0` permanently. An entrance may only ever be an
 *    enhancement on top of a visible row, never the thing that makes it
 *    visible — so a row that is already in view is simply drawn at rest, and
 *    only a row still below the fold is given an entrance to play.
 */
const useEntrance = (row: React.RefObject<HTMLUListElement | null>) => {
  const reduced = useReducedMotion();
  const [entrance, setEntrance] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const box = row.current?.getBoundingClientRect();
    if (box && box.top > window.innerHeight) setEntrance(true);
  }, [reduced, row]);
  return entrance;
};

const cardClassName = `flex min-w-0 grow-0 shrink-0 flex-col gap-3 p-4 ${CARD_WIDTH} ${CARD}`;

const CardBody = ({ item, locale }: { item: OrganizationCardPublic; locale: AppLocale }) => (
  <>
    <OrganizationLogo logo={item.logo} name={item.name} locale={locale} size="card" decorative />
    <p className="text-center text-body-sm font-bold text-balance text-[color:var(--color-text-primary)]">
      <OrganizationName name={item.name} locale={locale} />
    </p>
  </>
);

const PlainRow = ({
  items,
  locale,
  className,
  rowRef,
  motionName,
}: RowProps & { rowRef?: React.Ref<HTMLUListElement>; motionName?: string }) => (
  <ul ref={rowRef} data-reveal="" data-motion={motionName} className={className}>
    {items.map((item) => (
      <li key={item.id} data-reveal-part="rise" className={cardClassName}>
        <CardBody item={item} locale={locale} />
      </li>
    ))}
  </ul>
);

export const PartnersRowCinematic = ({ items, locale, className }: RowProps) => {
  const row = useRef<HTMLUListElement>(null);
  const entrance = useEntrance(row);
  if (!entrance) {
    return <PlainRow items={items} locale={locale} className={className} rowRef={row} motionName="cinematic-partners" />;
  }

  // The inline axis, the way the strip carries it: +1 reading right to left.
  const direction = locale === "ar" ? 1 : -1;

  return (
    <ul data-motion="cinematic-partners" className={className}>
      {items.map((item, index) => (
        <m.li
          key={item.id}
          className={cardClassName}
          initial={{ opacity: 0, x: LANE_TRAVEL * direction * (index % 2 === 0 ? 1 : -1) }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{
            // DS-DEVIATION: a spring, and an overshooting one. Chapter 5 §5.6
            // reserves `DT-MOTION-EASING-SPRING` for "celebratory moments only
            // (medal, record)". The overshoot is the whole gesture — a runner
            // steps past the line and squares up — and the standard curve
            // lands the card dead, which reads as a slide, not an arrival.
            //
            // DS-DEVIATION: roughly 760ms to settle. §5.6's longest duration
            // is 480ms, labelled "Hero celebratory animations only", and the
            // longest ordinary one is 320ms. A lateral arrival that reads as
            // deliberate is a twitch at 320ms.
            type: "spring",
            stiffness: 260,
            damping: 22,
            // DS-DEVIATION: the stagger. §5.7 caps total stagger at 600ms;
            // eight partners at 90ms each is 720ms. That cap protects
            // perceived speed for content a reader is waiting on — this row
            // is below the fold and already in view when it starts.
            delay: index * 0.09,
          }}
        >
          <CardBody item={item} locale={locale} />
        </m.li>
      ))}
    </ul>
  );
};

export const MembershipsRowCinematic = ({ items, locale, className }: RowProps) => {
  const row = useRef<HTMLUListElement>(null);
  const entrance = useEntrance(row);
  if (!entrance) {
    return <PlainRow items={items} locale={locale} className={className} rowRef={row} motionName="cinematic-memberships" />;
  }

  return (
    <ul data-motion="cinematic-memberships" className={className}>
      {items.map((item, index) => (
        <m.li
          key={item.id}
          className={cardClassName}
          // No travel: joining is not arriving from somewhere else. The card
          // resolves from slightly too close to its true size.
          //
          // DS-DEVIATION: an entrance scale at all. `organization-card.tsx`
          // refuses a hover response because a card that answers a pointer
          // and does nothing on click is a false affordance. An entrance is
          // not an affordance, but the system has no vocabulary for that
          // difference, so this reads as a departure until one exists.
          initial={{ opacity: 0, scale: 1.06 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{
            // DS-DEVIATION: 620ms, past §5.6's 480ms ceiling, on the
            // decelerating curve. Seating arrives and stops and never
            // overshoots — the opposite of the partners row, which is the
            // point of having two.
            duration: 0.62,
            ease: [0, 0, 0.2, 1],
            // DS-DEVIATION: stagger again, 70ms apart, in fixed order from
            // the inline start. Five memberships is 280ms and inside §5.7's
            // cap; a longer list is not.
            delay: index * 0.07,
          }}
        >
          <CardBody item={item} locale={locale} />
        </m.li>
      ))}
    </ul>
  );
};
