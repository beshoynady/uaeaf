import Image from "next/image";
import type { ReactNode } from "react";

import { BrandStreaks } from "../accent/brand-streaks";
import { TricolorDivider } from "../accent/tricolor-divider";

export type SplitFeatureProps = {
  title: ReactNode;
  children: ReactNode;
  /** Project asset path. Never a remote URL. */
  src: string;
  /**
   * Decorative unless the photograph carries information the text does not.
   * An empty string is a decision; a missing prop would be an oversight.
   */
  alt: string;
  /**
   * Which side the image falls on, in reading order.
   *
   * `end` puts it after the text. Alternating down a page is what keeps a
   * column of these from reading as a list — which is the whole reason this
   * shape exists instead of a stack of cards.
   */
  media?: "start" | "end";
  className?: string;
};

/**
 * A photograph beside a block of text, with the motif behind the image.
 *
 * The institutional pages' main body shape: a statement, its supporting text,
 * and one photograph. Chapter 27 §38 asks a page to alternate big single
 * moments with calm ones rather than repeating one card grid, and this is the
 * big half.
 *
 * `media` is a *logical* side — `start` and `end`, not left and right — so the
 * composition mirrors with reading direction while the motif behind the image
 * keeps its angle (ADR-0098 D4).
 *
 * `sizes` describes the real layout: half the viewport from the two-column
 * breakpoint up, the whole of it below. A single fixed value would ship a
 * desktop-width image to a phone.
 *
 * Server Component.
 */
export const SplitFeature = ({
  title,
  children,
  src,
  alt,
  media = "end",
  className,
}: SplitFeatureProps) => (
  <div
    className={["brand-split-feature", className].filter(Boolean).join(" ")}
    data-media={media}
  >
    <div className="brand-split-feature__text">
      <h2 className="brand-split-feature__title">{title}</h2>
      <TricolorDivider />
      <div className="brand-split-feature__body">{children}</div>
    </div>

    <div className="brand-split-feature__media">
      <BrandStreaks placement="behind-photo" />
      <Image
        className="brand-split-feature__image"
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 64rem) 50vw, 100vw"
      />
    </div>
  </div>
);
