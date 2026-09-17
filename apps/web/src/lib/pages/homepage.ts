import { fetchPublic } from "@/lib/api/public-client";
import { HERO_PLAYBACK, eventBarState } from "@uaeaf/content/hero";
import type { NextEventLike } from "@uaeaf/content/hero";
import type { HeroSlidePublic, PagePublic, PageSectionPublic } from "@/lib/api/types";

/**
 * Reading the composed homepage.
 *
 * The composition is three public reads — `pages` → `pageSections` →
 * `heroSlides` — because that is how the CMS models a page: a page owns
 * ordered sections, and a HERO section owns ordered slides. Each read is
 * cached for `PUBLIC_REVALIDATE_SECONDS`, so the chain costs one round trip
 * per link only on a cold render.
 *
 * Every failure resolves to an empty composition rather than an error. A
 * federation's front door must render while the API restarts; the page then
 * decides what an empty composition means for it, which for the homepage is
 * "stay out of the index" rather than "show a broken frame".
 */

/** The slug the homepage's `pages` row is stored under. */
export const HOMEPAGE_SLUG = "home";

export interface HomepageComposition {
  page: PagePublic | null;
  sections: PageSectionPublic[];
  heroSlides: HeroSlidePublic[];
  heroSection: PageSectionPublic | null;
}

const EMPTY: HomepageComposition = { page: null, sections: [], heroSlides: [], heroSection: null };

export const loadHomepage = async (): Promise<HomepageComposition> => {
  const page = await fetchPublic<PagePublic | null>(`/pages/public/${HOMEPAGE_SLUG}`);
  // The route answers 200 with a literal `null` for a missing or Draft page,
  // so an absent body is the ordinary "not published yet" state.
  if (!page?.id) return EMPTY;

  const sections = (await fetchPublic<PageSectionPublic[]>(`/page-sections/public/by-page/${page.id}`)) ?? [];
  const heroSection = sections.find((section) => section.sectionType === "HERO") ?? null;
  if (!heroSection) return { page, sections, heroSlides: [], heroSection: null };

  const heroSlides =
    (await fetchPublic<HeroSlidePublic[]>(`/hero-slides/public/by-section/${heroSection.id}`)) ?? [];

  return { page, sections, heroSlides, heroSection };
};

/**
 * The next-event bar's content, typed by an editor into the HERO section's
 * settings (owner decisions 2026-09-17): a label, a name and a venue in both
 * languages, and when the event starts and ends. There is no events entity
 * (ADR-0081 stays Proposed), so the bar carries no link.
 *
 * Whether the bar is drawn is `eventBarState` from `@uaeaf/content/hero`, the
 * same function the dashboard's preview uses: switched off, incomplete or over
 * means no bar at all, because a half-filled bar is the federation announcing
 * something it cannot name.
 */
export interface NextEvent {
  label: string;
  name: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  /** The stored event, both languages, for the browser's minute tick. */
  event: NextEventLike;
}

export const readNextEvent = (
  section: PageSectionPublic | null,
  locale: "ar" | "en",
  now: Date = new Date(),
): NextEvent | null => {
  const event = (section?.configuration?.nextEvent ?? null) as NextEventLike | null;
  if (eventBarState(event, now).state === "hidden" || !event) return null;
  return {
    label: event.label[locale],
    name: event.name[locale],
    venue: event.venue[locale],
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    event,
  };
};

export interface Playback {
  autoplay: boolean;
  intervalMs: number;
}

/** The slides' playback as the editor set it, or autoplay at the default
 *  duration when the section carries nothing the site supports. */
export const readPlayback = (section: PageSectionPublic | null): Playback => {
  const stored = section?.configuration?.playback as Partial<Playback> | undefined;
  const intervalMs =
    typeof stored?.intervalMs === "number" && HERO_PLAYBACK.intervals.includes(stored.intervalMs)
      ? stored.intervalMs
      : HERO_PLAYBACK.defaultIntervalMs;
  return { autoplay: typeof stored?.autoplay === "boolean" ? stored.autoplay : true, intervalMs };
};
