import type { ReactNode } from "react";

import { Surface } from "../surface/surface";

/**
 * The three grounds a feature card may stand on, in the order they alternate.
 *
 * Alternating is the point. A column of six goal cards all on green is a
 * green wall; alternating green, ink and red across the row gives the set a
 * rhythm and keeps any one identity colour from becoming the page's
 * background. Green and red are never adjacent in the cycle — ink always
 * falls between them — which is the adjacency rule applied at card scale.
 */
export type FeatureTone = "green" | "ink" | "red";

export const FEATURE_CYCLE: readonly FeatureTone[] = ["green", "ink", "red"];

export type FeatureCardProps = {
  title: ReactNode;
  description?: ReactNode;
  /** A step or index number, shown as a large ghost figure behind the title. */
  ordinal?: string;
  /** An icon or glyph. Decorative: the title carries the meaning. */
  icon?: ReactNode;
  tone?: FeatureTone;
  className?: string;
};

const SURFACE_OF: Record<FeatureTone, "brand-green" | "ink" | "brand-red"> = {
  green: "brand-green",
  ink: "ink",
  red: "brand-red",
};

/**
 * A card that *is* an identity colour, for the goals and axes of an
 * institutional page.
 *
 * This replaces the pastel item palette on those pages. `color.item.*` is a
 * governed, measured family (ADR-0072 D1) and remains correct where a closed
 * set needs position colours — but on a strategy or vision page the cards are
 * the federation's own statements, and the owner's instruction is that they
 * carry the federation's own colours.
 *
 * One ink, white, on every tone: these are the two gradient grounds and ink,
 * all of which carry exactly one text tier (ADR-0098 §8.2). The ordinal is a
 * ghost of that same white rather than a second colour.
 *
 * Server Component.
 */
export const FeatureCard = ({
  title,
  description,
  ordinal,
  icon,
  tone = "green",
  className,
}: FeatureCardProps) => (
  <Surface
    kind={SURFACE_OF[tone]}
    as="article"
    /* Ink needs a non-surface edge cue (ADR-0098 §8.4); on a card the mesh is
       the one that fits — an accent bar across a card reads as a header. */
    mesh={tone === "ink"}
    className={["brand-feature-card", className].filter(Boolean).join(" ")}
  >
    {ordinal === undefined ? null : (
      <span className="brand-feature-card__ordinal" aria-hidden="true">
        {ordinal}
      </span>
    )}
    {icon === undefined ? null : (
      <span className="brand-feature-card__icon" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3 className="brand-feature-card__title">{title}</h3>
    {description === undefined ? null : (
      <p className="brand-feature-card__description">{description}</p>
    )}
  </Surface>
);
