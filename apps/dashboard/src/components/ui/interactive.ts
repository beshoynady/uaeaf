/**
 * The canonical interaction-state class strings.
 *
 * `packages/ui` is declared as a workspace and contains no files, so every
 * control in this application was styled by copying a class string from the
 * previous one. The result was measurable: thirty-eight buttons and a single
 * `active:` state between them, five search inputs that removed the focus
 * outline without replacing it, and ten controls that set `disabled` without
 * styling it. None of those were decisions — they were what happens when the
 * definition lives in thirty-eight places.
 *
 * Guarded by `interactive.spec.ts` (each string carries its full state set)
 * and by `../../lib/design-system/interaction-state-contract.spec.ts` (call
 * sites either consume these or carry the states inline).
 */

/**
 * The focus indicator, shared by every control.
 *
 * A **painted ring with a painted offset**, not `outline` + `outline-offset`.
 * The difference matters now that section registers exist: `outline-offset`
 * leaves the gap transparent, so a black ring on a Federation Green ground
 * sits black-on-green and all but disappears. `ring-offset-[color]` paints the
 * gap white, which is the entire reason ADR-0051 defined `focus.offset` as the
 * widest-contrast partner to `focus.ring` — white measures 9.40:1 on the green
 * register, 8.14:1 on red and 21:1 on black, so the indicator is guaranteed
 * visible on any surface the system can produce.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";

/** ADR-0009: transform/opacity only, timed by token — never `transition: all`. */
const TRANSITION =
  "transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)]";

/** Protocol §14 minimum touch target. `h-11` is exactly 44px on the 4px grid. */
const TOUCH_TARGET = "min-h-11";

const BUTTON_BASE = `inline-flex items-center justify-center gap-2 ${TOUCH_TARGET} rounded-[var(--button-radius)] px-4 text-label font-medium ${TRANSITION} ${FOCUS_RING} disabled:cursor-not-allowed`;

/** Filled brand action. One per view — Chapter 8 L1 CTA hierarchy. */
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-[color:var(--button-primary-background)] text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)] disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)]`;

/** Outlined companion action. */
export const BUTTON_SECONDARY = `${BUTTON_BASE} border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] disabled:border-[color:var(--color-border-default)] disabled:bg-[color:var(--color-surface-sunken)] disabled:text-[color:var(--color-text-disabled)]`;

/**
 * Irreversible action. Uses `semantic.error`, not `brand.secondary` — ADR-0051
 * separated the two precisely so that "this deletes something" and "this is
 * the federation's red" can never be confused for one another.
 */
export const BUTTON_DESTRUCTIVE = `${BUTTON_BASE} bg-[color:var(--color-semantic-error)] text-[color:var(--color-text-on-brand)] hover:bg-[color:var(--color-semantic-error-hover)] active:bg-[color:var(--color-semantic-error-hover)] disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--color-text-disabled)] disabled:opacity-[var(--opacity-disabled)]`;

/** Low-emphasis action inside a dense surface. */
export const BUTTON_GHOST = `${BUTTON_BASE} bg-transparent text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)] disabled:text-[color:var(--color-text-disabled)]`;

/**
 * A field's outer shell carries the focus treatment, because the input inside
 * fills it edge to edge and a ring drawn on the input would be clipped by the
 * shell's own border radius.
 */
export const FIELD_SHELL = `flex ${TOUCH_TARGET} items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-3 ${TRANSITION} focus-within:border-[color:var(--color-border-strong)] focus-within:ring-2 focus-within:ring-[color:var(--a11y-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--a11y-focus-offset)] has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-[color:var(--color-surface-sunken)] has-[:disabled]:opacity-[var(--opacity-disabled)] has-[[aria-invalid=true]]:border-[color:var(--color-semantic-error)]`;

/**
 * The input itself. `outline-none` is correct here and only here: the shell
 * above draws the indicator, and leaving the UA outline on would paint a
 * second, misaligned rectangle inside the first.
 */
export const FIELD_INPUT =
  "min-w-0 flex-1 bg-transparent text-label text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-muted)] disabled:cursor-not-allowed";

/** A row or card that selects something — list items, media tiles, page rows. */
export const SELECTABLE_ROW = `w-full ${TOUCH_TARGET} rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-start ${TRANSITION} ${FOCUS_RING} hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)] aria-[current=true]:border-[color:var(--color-brand-primary)] aria-[pressed=true]:border-[color:var(--color-brand-primary)]`;

/** One segment of a segmented control — view switches, filters. */
export const TOGGLE_SEGMENT = `inline-flex ${TOUCH_TARGET} items-center justify-center rounded-[var(--radius-sm)] px-3 text-label ${TRANSITION} ${FOCUS_RING} hover:bg-[color:var(--color-surface-raised)] active:bg-[color:var(--color-surface-skeleton)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] aria-[pressed=true]:bg-[color:var(--color-surface-raised)] aria-[pressed=true]:font-bold aria-[pressed=true]:shadow-card`;

/**
 * The registry the contract test resolves call sites against. Any control
 * added here is automatically accepted as carrying its states; any control
 * that is not must carry them inline and be caught if it does not.
 */
export const INTERACTIVE_CLASS_NAMES = {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_DESTRUCTIVE,
  BUTTON_GHOST,
  FIELD_SHELL,
  FIELD_INPUT,
  SELECTABLE_ROW,
  TOGGLE_SEGMENT,
} as const;
