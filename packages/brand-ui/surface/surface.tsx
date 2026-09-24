import type { ElementType, ReactNode } from "react";

/**
 * The grounds of the identity layer (ADR-0098 D2): five expressive ones plus
 * the neutral plate.
 *
 * `canvas` binds to the page ground that already exists; `ink` is the fixed
 * `#0B0B0B`; the two brand kinds are a short ramp from the Pantone value
 * itself; `photo-light` is a photograph under a wash and is rendered through
 * `PhotoSurface` rather than here.
 *
 * `raised` is the odd one and is not an expressive ground: it is the neutral
 * plate a card paints inside a section. It exists because a plate IS a
 * surface — everything on it reads the on-surface variables — and a card on a
 * coloured section that does not re-establish them paints the section's white
 * ink onto its own white body.
 */
export type SurfaceKind =
  | "canvas"
  | "raised"
  | "photo-light"
  | "brand-green"
  | "brand-red"
  | "ink";

/**
 * The kinds, as a list.
 *
 * Exported so that the Brand Kit's matrix and anything else that wants to
 * iterate them does not keep its own copy — two copies were already drifting
 * before this existed. The register surfaces (`section-green` and friends) are
 * deliberately absent: they exist for `Section` to borrow and nothing chooses
 * one for a component.
 */
export const SURFACE_KINDS: readonly SurfaceKind[] = [
  "canvas",
  "raised",
  "photo-light",
  "brand-green",
  "brand-red",
  "ink",
];

export type SurfaceProps = {
  kind: SurfaceKind;
  /**
   * The mesh tint: two radial fields, green and red, in opposite corners.
   *
   * On `ink` this is not decoration. That ground measures 1.05:1 against the
   * dark page, so the section needs a cue that is not the ground — either this
   * or a `BrandAccentBar` as its first child. Passing neither is a defect that
   * `surface-adjacency-contract.spec.ts` fails on.
   */
  mesh?: boolean;
  /** Defaults to `section`, which is what a surface almost always is. */
  as?: ElementType;
  /**
   * An anchor target — a skip link's destination, usually.
   *
   * Narrow on purpose: this is the one attribute a surface genuinely needs to
   * carry, because the alternative is a wrapper element between the surface
   * and its content just to hold an `id`. `style` and arbitrary `data-*` are
   * deliberately absent; the first would invite inline colours and the second
   * a second way to configure the surface.
   */
  id?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * A ground that tells everything inside it what colour to be.
 *
 * `data-surface` is the whole mechanism. It publishes a fixed set of custom
 * properties (see `packages/design-tokens/css/surfaces.css`), and every
 * component in this package reads them through the cascade. That is why none
 * of them takes an `onDark`, `theme` or `background` prop: such a prop is a
 * second source of truth for a fact the DOM already carries, and it is wrong
 * the moment the component moves to a different section. Moving a
 * `DocumentCard` from the canvas onto ink requires changing nothing about the
 * card.
 *
 * Server Component: there is no state here and no event handler, so there is
 * no reason to ship it.
 */
export const Surface = ({
  kind,
  mesh = false,
  as: Element = "section",
  id,
  className,
  children,
}: SurfaceProps) => (
  // `brand-surface` is what paints. `data-surface` alone only publishes the
  // variables, which is how `Section`'s register bands borrow them without
  // having their own ground repainted.
  <Element
    data-surface={kind}
    id={id}
    className={["brand-surface", className].filter(Boolean).join(" ")}
  >
    {/*
      The mesh is an element rather than a background layer on the surface
      itself, so that a surface can carry a photograph, a mesh and its own
      ground without three `background-image` layers competing for one
      shorthand. `aria-hidden` because it carries nothing to read.
    */}
    {mesh ? <div className="brand-mesh" aria-hidden="true" /> : null}
    {children}
  </Element>
);
