import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * How the edge behaves (ADR-0098 D5).
 *
 * - `static` — painted, never moves.
 * - `hover`  — rotates while the pointer is inside or focus is within, stops
 *              on exit. **Public site only**: Chapter 12 §12.15.1 forbids it in
 *              the dashboard, because an operator's pointer crosses dozens of
 *              rows a minute and motion following it is noise. PR-001 prevails
 *              over PR-005 in that conflict (Chapter 2 §Resolution).
 * - `live`   — rotates continuously while a broadcast is live, and stops when
 *              the broadcast ends. The one continuous motion in the system,
 *              admissible because the interface does not choose when it stops:
 *              the motion ending *is* the information. **At most one in any
 *              view.**
 */
export type BrandBorderVariant = "static" | "hover" | "live";

/**
 * Which colours the edge is drawn in. A `tone` other than `tricolor` still
 * becomes the tricolour while rotating, so the rotation reads as the identity
 * rather than as a spinning green line.
 */
export type BrandBorderTone = "tricolor" | "green" | "red";

export type BrandBorderProps = {
  variant?: BrandBorderVariant;
  tone?: BrandBorderTone;
  /** `circle` is the ring around a portrait; it steps up to `--border-width-ring`. */
  shape?: "rounded" | "circle";
  as?: ElementType;
  className?: string;
  /**
   * Geometry only — an `aspect-ratio`, or a custom property a stagger reads.
   *
   * Not colour: the band's colours come from `tone` and from the surface, and a
   * `background` set here would sit behind the ring where nothing measured it.
   */
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * The one bordered container in the system.
 *
 * **The band is a masked pseudo-element, and the interior stays transparent.**
 * Two other techniques were tried first and both fail in ways that look fine
 * in review: `border-image` ignores `border-radius` entirely and draws square
 * gradient corners around a rounded fill, and the `padding-box`/`border-box`
 * pair needs an opaque interior colour, which it takes from the surface — so
 * it disappears on the two brand grounds, where the surface is itself a
 * gradient, and it cannot ring a photograph. The full reasoning, with the
 * measurement that found it, is on `.brand-ring` in `accent.css`, which this
 * component and three controls all share.
 *
 * **Why no `'use client'`.** Hover and focus-within are CSS, and the rotation
 * is an animation on a registered custom property. There is no state and no
 * handler, so this stays a Server Component even in its `hover` variant — the
 * interaction costs no JavaScript at all.
 *
 * **Reduced motion.** The rotation stops and the border stays visible, static,
 * at full strength. The border is the affordance; the rotation is emphasis.
 * Removing the motion must never remove the mark (Chapter 5 §5.8).
 */
export const BrandBorder = ({
  variant = "static",
  tone = "tricolor",
  shape = "rounded",
  as: Element = "div",
  className,
  style,
  children,
}: BrandBorderProps) => (
  <Element
    className={["brand-border", "brand-ring", className].filter(Boolean).join(" ")}
    data-variant={variant}
    data-tone={tone}
    data-shape={shape}
    style={style}
  >
    {/*
      The band is drawn by the pseudo-element on the outer box. This wrapper
      rounds and clips the content inside it, so a card with a coloured header
      does not show square corners through a rounded ring.
    */}
    <div className="brand-border__inner">{children}</div>
  </Element>
);
