import type { ReactElement } from "react";

/**
 * The twelve glyphs a value may carry.
 *
 * Vendored SVG rather than an icon dependency: ADR-0065 D6's threshold for
 * taking on a runtime package is not met by twelve static drawings, and
 * ADR-0069 D2 fixed the set as an enum upstream precisely so the choice is
 * closed. `value-icons.spec.tsx` reads that enum and fails if this file and
 * the API ever disagree.
 *
 * Drawn on a 24-unit grid with a 2-unit stroke in `currentColor`, so a value
 * card's chip supplies the colour (ADR-0066 D3: one green chip treatment,
 * never a per-icon hue — which is the defect the enum exists to prevent).
 */

/** The API's order, which is the order the picker offers. The first five are
 *  the keys the approved frames already use. */
export const VALUE_ICON_KEYS = [
  "eye",
  "users",
  "star",
  "award",
  "zap",
  "target",
  "handshake",
  "trophy",
  "medal",
  "flag",
  "lightbulb",
  "shield-check",
] as const;

export type ValueIconKey = (typeof VALUE_ICON_KEYS)[number];

const PATHS: Record<ValueIconKey, ReactElement> = {
  eye: (
    <g>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  ),
  users: (
    <g>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.4a3.2 3.2 0 0 1 0 5.2M17.5 14a6.5 6.5 0 0 1 4 5.5" />
    </g>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />,
  award: (
    <g>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.4 13.6-1.4 7 5-2.6 5 2.6-1.4-7" />
    </g>
  ),
  zap: <path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13L13.5 2Z" />,
  target: (
    <g>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.3" />
    </g>
  ),
  handshake: (
    <g>
      <path d="m9 12 3 3 3-3 3.5 3.5a2 2 0 0 1-2.8 2.8L12 15.6l-3.7 2.7a2 2 0 0 1-2.8-2.8L9 12Z" />
      <path d="M3.5 9.5 7 6h4l1 1 1-1h4l3.5 3.5" />
    </g>
  ),
  trophy: (
    <g>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5.5H4.5A2.5 2.5 0 0 0 7 10M17 5.5h2.5A2.5 2.5 0 0 1 17 10" />
      <path d="M12 14v3.5M8.5 20.5h7" />
    </g>
  ),
  medal: (
    <g>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M12 12.6 13 14.6l2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3 1-2Z" />
      <path d="M8.5 9.6 6 3h12l-2.5 6.6" />
    </g>
  ),
  flag: (
    <g>
      <path d="M5 21V3.8" />
      <path d="M5 4.5h12l-2.2 4 2.2 4H5" />
    </g>
  ),
  lightbulb: (
    <g>
      <path d="M9 17a6 6 0 1 1 6 0v1.5H9V17Z" />
      <path d="M10 21h4" />
    </g>
  ),
  "shield-check": (
    <g>
      <path d="M12 2.8 4.8 5.6v5.9c0 4.4 3 7.9 7.2 9.7 4.2-1.8 7.2-5.3 7.2-9.7V5.6L12 2.8Z" />
      <path d="m8.8 11.8 2.3 2.3 4.1-4.4" />
    </g>
  ),
};

const isKnown = (key: string): key is ValueIconKey => key in PATHS;

/**
 * One glyph, sized by its container.
 *
 * `aria-hidden` always: it repeats a choice the author made in a named
 * control beside it, so announcing it would read the value's name twice.
 *
 * An unrecognised key draws nothing rather than throwing. Content already
 * stored can name a key the enum retires later, and a screen that crashes on
 * old content is worse than one that shows it without its glyph.
 */
export function ValueIcon({
  iconKey,
  className = "size-5",
}: {
  iconKey: string;
  className?: string;
}) {
  if (!isKnown(iconKey)) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
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
}
