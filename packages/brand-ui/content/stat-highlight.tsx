import type { ReactNode } from "react";

export type StatHighlightProps = {
  /** Already formatted for the locale — digits, separators and all. */
  value: string;
  /** The unit beside the figure, e.g. "ثانية" / "seconds". */
  unit?: string;
  /** What the figure measures. Always present: a number with no label is trivia. */
  label: ReactNode;
  className?: string;
};

/**
 * One large figure with its unit and its label.
 *
 * `font-variant-numeric: tabular-nums` so a row of these does not jitter when
 * the digits differ in width — the same reason results tables use it.
 *
 * **The figure is not painted in an accent colour.** On the red ground it is
 * white like everything else there, and on canvas it is the primary ink. A
 * large figure is already the most prominent thing in its region; colouring it
 * as well would be emphasis applied twice, and on `brand-red` there is no
 * second ink to apply (ADR-0098 §8.2). Size is the emphasis.
 *
 * Server Component.
 */
export const StatHighlight = ({ value, unit, label, className }: StatHighlightProps) => (
  <div className={["brand-stat-highlight", className].filter(Boolean).join(" ")}>
    <p className="brand-stat-highlight__figure">
      <span className="brand-stat-highlight__value">{value}</span>
      {unit === undefined ? null : (
        <span className="brand-stat-highlight__unit">{unit}</span>
      )}
    </p>
    <p className="brand-stat-highlight__label">{label}</p>
  </div>
);
