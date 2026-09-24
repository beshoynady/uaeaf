/**
 * The chrome the video system draws around its content.
 *
 * One definition each, because the alternative is measured: the same ghost pill
 * was pasted at six call sites, and the ADR-0098 pass had to edit all six by
 * hand -- which is also how one of them ends up a shade different from the
 * other five.
 *
 * Class strings and not components: these dress a link, a submit button and a
 * dialog's close button, which have nothing else in common. A component would
 * have to take each of those as a prop and would earn nothing for it.
 */

import { FOCUS, TOUCH_TARGET, TRANSITION } from "@/components/ui/interactive";

/**
 * The secondary action: a pill with an edge and no fill, which the ground
 * shows through until a pointer is on it.
 *
 * `vs-ghost` carries the hover and active tints, from `video-system.css`. They
 * are a class rather than `hover:bg-[…]` because an arbitrary Tailwind value
 * may not contain a space -- written with one, the class list splits mid-value
 * and the hover is silently never generated.
 *
 * Padding stays at the call site: it is the one thing that genuinely differs
 * between a header link and a dialog's dismiss.
 */
export const GHOST_PILL = `vs-ghost vs-edge inline-flex ${TOUCH_TARGET} items-center gap-2 rounded-[var(--radius-full)] text-body-sm font-semibold ${TRANSITION} ${FOCUS}`;

/**
 * `FOCUS` with the 4px gap a card takes.
 *
 * Written out rather than composed from `FOCUS`, because Tailwind finds class
 * names by scanning source text: a string built at runtime generates no CSS,
 * and the ring would simply not be drawn.
 */
export const FOCUS_WIDE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";
