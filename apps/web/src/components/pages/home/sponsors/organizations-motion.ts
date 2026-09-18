/**
 * The one switch between the two organisation rows this page can draw.
 *
 * `"compliant"` is the row ADR-0085 D5 approved and every guard measures: a
 * static wrapped row that appears with the page's own reveal. It is the
 * default and stays the default.
 *
 * `"cinematic"` is an exploration (2026-09-18) that deliberately leaves the
 * design system in places, each marked `// DS-DEVIATION:` where it happens.
 * It is not approved and must not become the default without a decision —
 * the conflicts it raises are written up rather than merged in quietly.
 *
 * Flipping this constant is the whole mechanism. Nothing else changes: both
 * rows render the same cards, in the same order, with the same markup around
 * them, so what is being compared is the motion and nothing else.
 */
export type OrganisationsMotion = "compliant" | "cinematic";

export const ORGANISATIONS_MOTION: OrganisationsMotion = "compliant";
