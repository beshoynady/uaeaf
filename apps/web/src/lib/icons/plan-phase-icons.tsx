import type { ReactElement } from "react";

/**
 * The four glyphs a phase of the strategic plan may carry (ADR-0075): the
 * icons the Figma frame draws for its timeline, from lucide (ISC), vendored as
 * paths rather than an icon dependency (ADR-0065 D6), in `currentColor`.
 *
 * The same drawings as `apps/dashboard/src/lib/icons/plan-phase-icons.tsx`,
 * so an editor sees in the picker what a visitor sees on the page.
 * `plan-phase-icons.spec.tsx` fails if this set and the API's enum disagree.
 */

export const PLAN_PHASE_ICON_KEYS = ["layers", "trending-up", "trophy", "sparkles"] as const;

export type PlanPhaseIconKey = (typeof PLAN_PHASE_ICON_KEYS)[number];

const PATHS: Record<PlanPhaseIconKey, ReactElement> = {
  layers: (
    <g>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </g>
  ),
  "trending-up": (
    <g>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </g>
  ),
  trophy: (
    <g>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </g>
  ),
  sparkles: (
    <g>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </g>
  ),
};

const isKnown = (key: string): key is PlanPhaseIconKey => key in PATHS;

/** One glyph, sized by its container, out of the accessibility tree: the
 *  phase's title names it. An unknown key draws nothing. */
export const PlanPhaseIcon = ({ iconKey, className = "size-6" }: { iconKey: string; className?: string }) => {
  if (!isKnown(iconKey)) return null;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[iconKey]}
    </svg>
  );
};
