export type BrandAccentBarProps = {
  /**
   * `expressive` is the public site's 4px edge; `operational` is the
   * dashboard's 3px (ADR-0098 D6, Chapter 12 §12.15). The names are the two
   * doses rather than the two numbers, so a future change to either height
   * happens in one stylesheet instead of at every call site.
   */
  dose?: "expressive" | "operational";
  className?: string;
};

/**
 * The tricolour edge (ADR-0098 D1 R3, D3).
 *
 * Green, a middle step that belongs to the ground it sits on, then red. It
 * encodes nothing — which is the point: it is identity colour, admissible
 * precisely because no reader has to decode it, and it is bounded to an edge
 * so that green and red never share a boundary a reader must resolve (they
 * measure 1.22:1 apart at the identity values).
 *
 * On `surface-ink` this bar is also load-bearing rather than ornamental: the
 * ink ground has no boundary of its own in dark theme, and the bar's white
 * middle step is what gives the section an edge.
 *
 * `aria-hidden` and no text: a decorative separator per Chapter 6 §6.11.
 */
export const BrandAccentBar = ({ dose = "expressive", className }: BrandAccentBarProps) => (
  <div
    className={["brand-accent-bar", className].filter(Boolean).join(" ")}
    data-dose={dose}
    aria-hidden="true"
  />
);
