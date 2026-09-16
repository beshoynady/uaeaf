/**
 * The closed set of icon identifiers a strategic-plan phase may name.
 *
 * A phase card is one of four fixed glyphs on the approved page composition
 * (Figma `720:624`): foundation, development, competitiveness, impact. The
 * editor picks from this list rather than typing a name, so the page never
 * receives a key it cannot draw — the same refusal `VALUE_ICON_KEYS` gives
 * the values lists (ADR-0069 D2).
 *
 * Delivery is vendored SVG in both apps, not a runtime icon dependency —
 * ADR-0065 D6's threshold is not met by four static glyphs.
 */
export const PLAN_PHASE_ICON_KEYS = ['layers', 'trending-up', 'trophy', 'sparkles'] as const;

export type PlanPhaseIconKey = (typeof PLAN_PHASE_ICON_KEYS)[number];
