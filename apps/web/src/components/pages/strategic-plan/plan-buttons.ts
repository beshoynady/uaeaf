import { TRANSITION } from "@/components/ui/interactive";

/**
 * The two button recipes the strategic plan's call to action uses on the
 * page's own ground: the same token recipe `vision-mission/strategy-cta.tsx`
 * keeps for itself, written here rather than exported from that built page
 * (brief §٧: nothing shared is changed for this page). A shared link-button
 * recipe is this page's candidate for generalisation, listed in its report.
 *
 * The focus ring is added where each link is drawn, so the interaction-state
 * contract sees it at the call site.
 */
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--button-radius)] px-4 py-3.5 text-body-sm font-semibold ${TRANSITION}`;

/** The primary action: the approved button recipe on the light ground. */
export const PLAN_PRIMARY = `${BUTTON} bg-[color:var(--button-primary-background)] text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)]`;

/** The secondary action: outlined in the accent colour on the page's ground. */
export const PLAN_SECONDARY = `${BUTTON} border border-[color:var(--color-border-accent)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-link)] hover:bg-[color-mix(in_srgb,var(--color-border-accent)_8%,var(--color-surface-base))] active:bg-[color-mix(in_srgb,var(--color-border-accent)_16%,var(--color-surface-base))]`;
