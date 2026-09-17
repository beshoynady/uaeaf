"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * The site's one motion library, configured once (ADR-0076).
 *
 * ── `reducedMotion="user"` is the point of putting this at the root ───────
 *
 * Chapter 5 §5.8 requires that motion stops entirely for a reader who asks
 * for reduced motion. Honouring that per component is a rule someone
 * eventually forgets in one place, and the forgetting is invisible to anyone
 * not testing with the preference on. Set here, it is the default for every
 * animation the library runs anywhere in the app — structure rather than
 * discipline.
 *
 * ── `LazyMotion` + `domAnimation` ────────────────────────────────────────
 *
 * The full `motion` component cannot be tree-shaken below about 34 KB because
 * its API is props-driven. `LazyMotion` with the `m` component and the
 * `domAnimation` feature set is roughly 4.6 KB at the entry point, and this
 * app animates DOM elements only — no layout projection, no drag, no SVG path
 * morphing. `motion-budget.spec.ts` fails if the full component is ever
 * imported, so the figure stays a fact rather than an intention.
 *
 * Children are passed through as a prop, so wrapping the tree here does not
 * turn the pages inside it into client components.
 */
export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  </MotionConfig>
);
