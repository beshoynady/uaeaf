import { getTranslations } from "next-intl/server";
import { eventBarState, formatEventDateTime } from "@uaeaf/content/hero";
import { HeroCountdown } from "./hero-countdown";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { NextEvent } from "@/lib/pages/homepage";

/**
 * The next-event bar, laid over the foot of the hero's picture (owner review
 * 2026-09-16): a dark translucent layer inside the hero's height with a thin
 * line of the federation's green along its top, never a separate black block.
 *
 * What it says, in the order the owner set (2026-09-17): the label, then when
 * and where, then the name, then how long until it starts, or that it is
 * running now. Everything is typed by an editor; the bar carries no link and is
 * not clickable (ADR-0081 stays Proposed). Without JavaScript the time, the
 * venue and the first countdown are there, drawn by the server.
 *
 * On a phone it is three short lines: when and where, the name, the countdown.
 */
export const HeroEventBar = async ({ event, locale }: { event: NextEvent; locale: AppLocale }) => {
  const copy = await getTranslations({ locale, namespace: "HomeHero.nextEvent" });
  const initial = eventBarState(event.event, new Date());

  return (
    <div
      data-hero-event=""
      className="pointer-events-auto relative w-full border-t-2 border-[color:var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-surface-overlay)_40%,transparent)] text-[color:var(--color-text-on-brand)]"
    >
      <div
        className={`${CONTAINER} flex min-h-[var(--hero-event-height)] flex-col justify-center gap-1 py-2 md:flex-row md:items-center md:justify-between md:gap-6 md:py-3`}
      >
        <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          <p className="text-overline hidden md:block">{event.label}</p>
          <p className="text-caption opacity-85">
            <time dateTime={event.startsAt}>{formatEventDateTime(event.startsAt, locale)}</time> · {event.venue}
          </p>
          <p className="text-body-sm font-bold">{event.name}</p>
        </div>
        <HeroCountdown
          event={event.event}
          initial={initial}
          labels={{
            days: copy("days"),
            hours: copy("hours"),
            minutes: copy("minutes"),
            live: copy("live"),
            countdown: copy.raw("countdown") as string,
          }}
        />
      </div>
    </div>
  );
};
