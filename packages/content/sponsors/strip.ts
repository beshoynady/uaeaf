/**
 * The global sponsor strip (ADR-0077 D5, ADR-0085 D7 and D9): who it shows,
 * which one is pinned, how wide one copy of the row is, how many copies keep
 * the seam out of sight, and how long one cycle runs. Shared by the site and
 * the dashboard's preview.
 *
 * Nothing is measured at run time. A layout decided from `window` needs
 * JavaScript to settle, which is a layout shift, so every width here is a
 * fixed one the server can use to draw the final layout (Chapter 5 §5.9).
 *
 * The row no longer has two states. D7's decision A and D8 #4 stood the row
 * still from the first breakpoint whose content width held every item, which
 * made the page's rhythm a function of how many sponsors the federation
 * happened to have that month. D9.1 removed it, and with it the breakpoint
 * table, the capacity arithmetic and the second set of CSS rules it needed.
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
  /** The one sponsorship held still at the head of the strip, or `null` when
   *  none is (ADR-0086 D2). One nullable id rather than a flag and a rule:
   *  "at most one, and choosing another replaces it" is then the only shape
   *  the data has. */
  pinnedSponsorshipId: string | null;
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
  pinnedSponsorshipId: null,
  speed: "medium",
};

export interface StripItems<T extends ShowcaseSponsorship> {
  /** Held at the head of the line, still, and absent from `others`. */
  pinned: T | null;
  others: T[];
}

/**
 * The sponsorships the strip shows at `now`, and which one is held still.
 *
 * The held one is whichever the editor chose (`pinnedSponsorshipId`,
 * ADR-0086 D2), not whichever the banner shows — ADR-0085 D5.1's automatic
 * agreement between the strip and the section is withdrawn, and the settings
 * screen names the banner's sponsorship so the choice is made knowing it.
 *
 * It is looked up among the sponsorships the strip can already show, so a
 * choice that has been unpublished, cancelled or has run out of window simply
 * is not found: nobody is held, no gap is left behind, and the rest travel.
 * That is the window logic deciding it rather than a second rule about
 * pinning. And because the held one is then removed from `others`, it can
 * never appear in both places at once.
 *
 * A manual selection keeps the editor's order and drops what is not running.
 */
export const stripItems = <T extends ShowcaseSponsorship>(
  items: readonly T[],
  settings: StripSettingsLike,
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

  const pinned = settings.pinnedSponsorshipId
    ? (chosen.find((item) => item.id === settings.pinnedSponsorshipId) ?? null)
    : null;
  return { pinned, others: chosen.filter((item) => item !== pinned) };
};

/**
 * The width each item is drawn at, in CSS pixels, per mode — the strip sets it
 * as the item's `inline-size` and lets a long name wrap inside, so the width
 * counted here is the width drawn (a count alone cannot promise a width that
 * grows with each name). `pinned` is the centrepiece: a label line over the
 * logo and name, wide enough that a name of about 24 characters stays on one
 * line beside its 80px plate (measured on "Ultimate Power Solution",
 * 2026-09-17).
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
 * The width of one copy of the row: every item plus the gap that follows it.
 *
 * The trailing gap is what makes the loop seamless. Copies are laid end to
 * end, so the space between the last item of one copy and the first of the
 * next is that gap — the same distance as every other gap in the row, and
 * therefore not a seam a reader can find.
 */
export const stripCopyWidth = (count: number, mode: StripDisplayMode): number =>
  count * (STRIP_ITEM_MIN[mode] + STRIP_GAP);

/**
 * The widest the track is ever drawn in: Chapter 5 §5.2's `2xl` content width.
 * A viewport wider than the container still shows only this much of the strip.
 */
const WIDEST_CONTENT = 1312;

/**
 * How many copies of the row to draw, and so whether it loops at all (D9.3).
 *
 * One cycle travels exactly one copy, so at the end of the cycle the track has
 * moved a copy's width and the frame must still be full. That needs the track
 * to be wider than the frame by a whole copy — `copies - 1` copies covering
 * the widest frame there is — which is what this computes. Two is the floor:
 * with one copy there is nothing to follow it.
 *
 * **Fewer than two sponsors is not a loop** (ADR-0086 D5), so it returns 0 and
 * the strip draws the row once, still. Repeating a single sponsor filled the
 * line with seven copies of one name, which reads as padding and — worse —
 * tells anyone scanning the band that the federation has more sponsors than it
 * has. That is a statement about the count, and it is wrong.
 *
 * Note what this is *not*: the "still while the row holds its items" rule
 * D9.1 removed measured the viewport and the row's capacity, so the same
 * sponsors stood still at one width and moved at another. This asks one
 * question about the number of sponsors and nothing else — there is no width
 * in it, and no breakpoint.
 */
export const stripCopies = (count: number, mode: StripDisplayMode): number => {
  if (count < 2) return 0;
  return Math.max(2, Math.ceil(WIDEST_CONTENT / stripCopyWidth(count, mode)) + 1);
};

/**
 * How fast the row travels, in CSS pixels per second, per the editor's three
 * speeds (ADR-0077 D5 #5).
 *
 * A rate rather than a duration, because a duration is not the thing a visitor
 * perceives: under D8 #2's seconds-per-item a longer row had to move faster to
 * finish in the same time, and a `logo` row crossed at 32px/s while a
 * `logoName` row on the same page crossed at 57px/s.
 *
 * The three numbers are not new. They are D8 #2's own approved seconds
 * divided into the default mode's track share, `STRIP_ITEM_MIN.logoName +
 * STRIP_GAP` = 256px (D8 #4): 256/6, 256/4.5 and 256/3. So a strip in the
 * default mode moves exactly as it did, and the other modes now match it.
 *
 * Chapter 5 §5.6's motion tokens are all durations for a discrete transition
 * and none of them describes a loop that never ends — which is what D8 #2
 * recorded. `--motion-duration-ambient` stays reserved (ADR-0069 D9).
 */
export const STRIP_PIXELS_PER_SECOND: Record<StripSpeed, number> = { slow: 42, medium: 57, fast: 85 };

/**
 * One cycle in seconds: the distance travelled over the rate.
 *
 * D8 #2's `SCOPE_EXTRA_SECONDS` is gone rather than carried over. It added 2s
 * an item because a scope line takes longer to read; at a fixed rate a wider
 * item already takes proportionally longer, and the two agree to within 5%
 * (352px at 57px/s is 6.18s against the old model's 6.5s) — an exception that
 * no longer has to exist.
 */
export const stripLoopSeconds = (count: number, mode: StripDisplayMode, speed: StripSpeed): number =>
  stripCopyWidth(count, mode) / STRIP_PIXELS_PER_SECOND[speed];
