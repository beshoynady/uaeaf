/**
 * The global sponsor strip (ADR-0077 D5, ADR-0085 D7): who it shows, which one
 * is pinned, whether the row stands still at a width, and how long one loop
 * takes. Shared by the site and the dashboard's preview.
 *
 * Nothing is measured at run time. A layout decided from `window` needs
 * JavaScript to settle, which is a layout shift; so the row's capacity comes
 * from the item count and the minimum widths below (`row-capacity.ts`'s
 * pattern), and the server draws the final layout.
 */
import { byTierThenOrder } from "./showcase";
import type { ShowcaseSponsorship } from "./showcase";
import { isInWindow } from "./window";

export type StripDisplayMode = "logo" | "logoName" | "logoNameScope";
export type StripSpeed = "slow" | "medium" | "fast";

export interface StripSettingsLike {
  isVisible: boolean;
  displayMode: StripDisplayMode;
  selection: "allActive" | "manual";
  sponsorshipIds: readonly string[];
  order: "tier" | "manual";
  pinTopTier: boolean;
  speed: StripSpeed;
}

/** The owner's defaults (ADR-0077 D5), the strip's state before anything is
 *  saved. The API serves the same values (`SPONSOR_STRIP_DEFAULTS`). */
export const STRIP_DEFAULTS: StripSettingsLike = {
  isVisible: true,
  displayMode: "logoName",
  selection: "allActive",
  sponsorshipIds: [],
  order: "tier",
  pinTopTier: true,
  speed: "medium",
};

export interface StripItems<T extends ShowcaseSponsorship> {
  /** Drawn at the centre, still, whether the row moves or not. */
  pinned: T | null;
  others: T[];
}

/**
 * The sponsorships the strip shows at `now`.
 *
 * The pinned one is the banner's (`bannerId`, from `selectShowcase`), so the
 * strip and the section never emphasise two different sponsors (ADR-0085 D5.1).
 * A manual selection keeps the editor's order and drops what is not running.
 */
export const stripItems = <T extends ShowcaseSponsorship>(
  items: readonly T[],
  settings: StripSettingsLike,
  bannerId: string | null,
  now: Date,
): StripItems<T> => {
  if (!settings.isVisible) return { pinned: null, others: [] };

  const running = items.filter((item) => isInWindow(item.startDate, item.endDate, now));
  let chosen: T[];
  if (settings.selection === "manual") {
    const byId = new Map(running.map((item) => [item.id, item]));
    chosen = settings.sponsorshipIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  } else {
    chosen = [...running].sort(settings.order === "tier" ? byTierThenOrder : (a, b) => a.displayOrder - b.displayOrder);
  }

  const pinned = settings.pinTopTier ? (chosen.find((item) => item.id === bannerId) ?? null) : null;
  return { pinned, others: chosen.filter((item) => item !== pinned) };
};

/** The breakpoints the strip's classes use, narrowest first (Chapter 5 §5.2). */
export const STRIP_BREAKPOINTS = ["base", "sm", "md", "lg", "xl", "2xl"] as const;
export type StripBreakpoint = (typeof STRIP_BREAKPOINTS)[number];

/** "What they sponsor" does not fit a phone's strip; below `md` it shows logo
 *  and name, and the dashboard says so (ADR-0077 D5 #7). */
export const stripDisplayMode = (mode: StripDisplayMode, breakpoint: StripBreakpoint): StripDisplayMode =>
  mode === "logoNameScope" && (breakpoint === "base" || breakpoint === "sm") ? "logoName" : mode;

/**
 * The width each item is drawn at, in CSS pixels, per mode — the strip sets it
 * as the item's `inline-size` and lets a long name wrap inside, so the
 * capacity promised here is the one drawn (a count alone cannot promise a width
 * that grows with each name). `pinned` is the centrepiece: a label line over the
 * logo and name, wide enough that a name of about 24 characters stays on one
 * line beside its 80px plate (measured on "Ultimate Power Solution", 2026-09-17).
 */
export const STRIP_ITEM_MIN: Record<StripDisplayMode | "pinned", number> = {
  logo: 112,
  logoName: 224,
  logoNameScope: 320,
  pinned: 360,
};

/** The gap between items, `--space-8`. */
export const STRIP_GAP = 32;

/**
 * The strip's usable width at the **start** of each breakpoint: the viewport
 * (360 for the narrowest phone this site measures) less the page margin on
 * both sides (Chapter 5 §5.2: 16 · 24 · 32 · 48 · 64 · 64, container 1440).
 */
const CONTENT_WIDTH: Record<StripBreakpoint, number> = { base: 328, sm: 592, md: 704, lg: 928, xl: 1152, "2xl": 1312 };

const rowWidth = (count: number, pinned: boolean, mode: StripDisplayMode): number => {
  const cells = count + (pinned ? 1 : 0);
  if (cells === 0) return 0;
  return count * STRIP_ITEM_MIN[mode] + (pinned ? STRIP_ITEM_MIN.pinned : 0) + (cells - 1) * STRIP_GAP;
};

/**
 * The first breakpoint from which every item stands still in one row, or
 * `null` when no width holds them and the row moves everywhere. Capacity only
 * grows with width, so a row that stands still never moves again further up
 * (decision A: still while the row holds its items).
 */
export const stripRowFrom = (count: number, pinned: boolean, mode: StripDisplayMode): StripBreakpoint | null =>
  // Nothing beside the pinned sponsor means nothing to move: it stands still at
  // every width, its box capped at the container (`sponsor-strip.tsx`).
  count === 0
    ? "base"
    : (STRIP_BREAKPOINTS.find((breakpoint) => rowWidth(count, pinned, stripDisplayMode(mode, breakpoint)) <= CONTENT_WIDTH[breakpoint]) ?? null);

/**
 * Seconds one item takes to cross its own width, per speed — reading time, the
 * same kind of number as the hero's slide intervals (`HERO_PLAYBACK`), not a
 * UI transition: no motion token describes a continuous loop, and
 * `--motion-duration-ambient` is reserved for one element (ADR-0069 D9). The
 * editor chooses among the three (ADR-0077 D5 #5). A scope line is longer to
 * read, so it travels more slowly (D5 #7).
 */
export const STRIP_SECONDS_PER_ITEM: Record<StripSpeed, number> = { slow: 6, medium: 4.5, fast: 3 };
const SCOPE_EXTRA_SECONDS = 2;

/** One loop's length in seconds: every item gets the same time on screen. */
export const stripLoopSeconds = (count: number, mode: StripDisplayMode, speed: StripSpeed): number =>
  Math.max(1, count) * (STRIP_SECONDS_PER_ITEM[speed] + (mode === "logoNameScope" ? SCOPE_EXTRA_SECONDS : 0));
