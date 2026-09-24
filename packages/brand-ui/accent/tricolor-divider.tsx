export type TricolorDividerProps = {
  className?: string;
};

/**
 * The short rule under a heading (ADR-0098 D1 R3).
 *
 * Distinct from `CMP-DIVIDER-001`, which is a neutral hairline drawn in
 * `border.default` and separates content groups. This one separates nothing:
 * it marks a heading as this federation's. That is why it is a new component
 * rather than a variant — a `role="separator"` that does not separate would be
 * a lie to a screen reader, so this is `aria-hidden` and the existing divider
 * keeps its semantics intact.
 *
 * Its length is fixed and short. A full-width tricolour rule under every
 * heading would be the "everywhere faintly" failure Chapter 27 §24 warns
 * against, and at full width the green and red ends stop reading as one mark.
 */
export const TricolorDivider = ({ className }: TricolorDividerProps) => (
  <div
    className={["brand-tricolor-divider", className].filter(Boolean).join(" ")}
    aria-hidden="true"
  />
);
