import { Surface, type SurfaceKind } from "@uaeaf/brand-ui";

import type { ReactNode } from "react";

/**
 * Every surface, every time.
 *
 * The Brand Kit's one structural idea: a specimen is written once and rendered
 * on every ground, so "works on any surface" is demonstrated rather than
 * asserted. A specimen that needed a prop per surface would fail to compile
 * here, which is the point.
 */
const KINDS: readonly SurfaceKind[] = [
  "canvas",
  "raised",
  "photo-light",
  "brand-green",
  "brand-red",
  "ink",
];

/**
 * `photo-light` is rendered through `Surface` rather than `PhotoSurface` here,
 * deliberately: the matrix is about the on-surface variables, and a photograph
 * repeated five times per specimen would make the page slower than it is
 * useful. `PhotoSurface` gets its own single specimen with a real image.
 */
export const SurfaceMatrix = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="brand-kit-specimen">
    <h2 className="brand-kit-specimen__title">{title}</h2>
    <div className="brand-kit-specimen__grid">
      {KINDS.map((kind) => (
        <Surface
          key={kind}
          kind={kind}
          /* Ink needs a non-surface edge (ADR-0098 §8.4); the mesh supplies it. */
          mesh={kind === "ink"}
          as="div"
          className="brand-kit-cell"
        >
          <p className="brand-kit-cell__label">{kind}</p>
          {children}
        </Surface>
      ))}
    </div>
  </section>
);
