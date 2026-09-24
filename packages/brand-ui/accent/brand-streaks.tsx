/**
 * Where the motif sits. Placement follows reading order through logical
 * properties; the **angle never does**.
 */
export type BrandStreaksPlacement = "corner" | "behind-photo" | "cross-headline";

export type BrandStreaksProps = {
  placement?: BrandStreaksPlacement;
  className?: string;
};

/**
 * The four-diagonal-line motif — the federation's one ownable graphic device.
 *
 * **This is the placement layer, and its geometry is a duplicate.**
 *
 * `apps/web/src/components/brand/uaeaf-motif.tsx` already draws this motif from
 * the real four strokes, with token-bound fills, a `tone="inherit"` mode for
 * coloured grounds, and the same never-mirror rule — and already calls itself
 * ADR-0005's Brand Pattern component. It was built before this package existed
 * and it was missed when this file was written. Two artworks for one signature
 * device is precisely what Chapter 27 §25 forbids.
 *
 * The geometry below is therefore **temporary**. The recorded resolution
 * (ADR-0098 D4) is to move `UaeafMotif` into this package and have this
 * component render it, keeping only what this file genuinely adds: the three
 * placements and the surface-resolved colour. Deferred because `UaeafMotif` is
 * consumed by built pages.
 *
 * **The angle does not mirror in RTL.** ADR-0005's rationale lists "supports
 * automatic RTL mirroring" among SVG's benefits; read as a licence it
 * contradicts Guide §9.1 and the absolute mirroring prohibition in the visual
 * protocol §9. The motif is derived from the logo's take-off angle, so a
 * mirrored angle is a mirrored identity mark. The stroke geometry below is
 * therefore literal and fixed, and only `placement` responds to direction.
 *
 * The 45-degree geometry is expressed as a diagonal across a 100×100 viewBox,
 * which is the same angle `--motion-ascent-angle` carries (measured from the
 * mark at a mean of 44.46°). It cannot read the custom property — SVG path
 * geometry is not a CSS value — so the two are kept equal by the
 * `brand-asset-contract` guard rather than by hope.
 *
 * Colour comes from the surface: `currentColor` inherits `--surface-text`,
 * which is black on light grounds, white on dark ones, and white on the two
 * brand grounds where Guide §6.1 requires the mark to be monochrome. One
 * component, no variants, correct on all five surfaces.
 *
 * `aria-hidden`, `focusable="false"`: decorative (Chapter 6 §6.11).
 */
export const BrandStreaks = ({ placement = "corner", className }: BrandStreaksProps) => (
  <svg
    className={["brand-streaks", className].filter(Boolean).join(" ")}
    data-placement={placement}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    {/*
      Four parallel strokes at the ascent angle. `vector-effect` keeps the
      stroke weight constant while `preserveAspectRatio="none"` stretches the
      box, so the lines do not fatten when the surface is wide.
    */}
    {[0, 22, 44, 66].map((offset) => (
      <line
        key={offset}
        x1={offset}
        y1="100"
        x2={offset + 34}
        y2="0"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </svg>
);
