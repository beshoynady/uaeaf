/**
 * The interaction states, defined once.
 *
 * The dashboard learned this the expensive way: five copies of one search
 * control, each removing the browser's focus outline and drawing nothing in
 * its place — WCAG 2.4.7 failing on the primary filter of four admin screens,
 * because the control had been copied rather than shared. The fix there was
 * one component; the fix here is to have one definition before there is
 * anything to copy.
 *
 * Deliberately per-application rather than in a shared package: Tailwind v4
 * discovers utilities by scanning source text under the app that owns the
 * stylesheet, so class strings living outside it generate no CSS and fail
 * silently. What genuinely is shared — the WCAG maths and the token reader —
 * lives in `@uaeaf/design-tokens/testing`, where nothing scans it.
 */

/**
 * The painted two-tone focus ring.
 *
 * `ring-offset-[color:…]`, not `outline-offset`. That distinction is the
 * whole point: `outline-offset` leaves the gap **transparent**, so ADR-0051's
 * white band — the thing that was supposed to guarantee visibility on any
 * background — was never drawn at all. On the coloured registers that is the
 * difference between a visible indicator and none: a black ring on the black
 * register is invisible, and the white band is what carries it.
 *
 * Measured on every register in every theme by `register-contrast.spec.ts`.
 */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";

/** Same, for a control whose indicator is drawn by its wrapper — an input
 *  filling a shell edge to edge, where a ring on the input itself would be
 *  clipped by the shell's radius. */
export const FOCUS_WITHIN =
  "focus-within:outline-none focus-within:ring-2 focus-within:ring-[color:var(--a11y-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--a11y-focus-offset)]";

/** Chapter 5 §5.6 maps `fast` (150ms) to focus and toggle changes, which is
 *  what a colour transition on a control is. A literal duration would also
 *  escape the reduced-motion token reset. */
export const TRANSITION =
  "transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)]";

/** IA §12 states ≥44px touch targets on every small screen as a KPI, and
 *  PR-006 makes the public layer mobile-priority — so this is the floor for
 *  every control here, not a mobile-only variant. */
export const TOUCH_TARGET = "min-h-11";
