import type { ReactNode } from "react";

import { TricolorDivider } from "../accent/tricolor-divider";

export type SectionHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  /**
   * The heading level. Defaults to `h2`, which is what a section heading is on
   * a page that already has an `h1`.
   *
   * A level, not a size: the size comes from the level's own type style, and a
   * page with two `h1`s is an outline defect the SEO guard already fails on.
   */
  level?: "h1" | "h2" | "h3";
  /**
   * `plate` sets the heading on a raised card whose inline edges carry the flag
   * colours. Reserved for a section that opens a page; a plate on every
   * heading is the uniform-rhythm failure Chapter 27 §38 names.
   */
  variant?: "plain" | "plate";
  /** Trailing content on the same row — a "view all" link, usually. */
  action?: ReactNode;
  className?: string;
};

/**
 * A section's title, its tricolour rule, and optionally a description.
 *
 * Server Component. The rule is the only identity element, and it is short:
 * this is the most-repeated component in the system, so it is also the quietest
 * one that still reads as UAEAF.
 */
export const SectionHeading = ({
  title,
  description,
  level = "h2",
  variant = "plain",
  action,
  className,
}: SectionHeadingProps) => {
  const Heading = level;

  return (
    <header
      className={["brand-section-heading", className].filter(Boolean).join(" ")}
      data-variant={variant}
      /* The plate paints its own neutral ground, so it declares one. Without
         this its title read `--surface-text` from the section around it — white
         on white wherever that section was ink or an identity ground, which is
         the exact defect the `raised` surface exists to prevent. */
      data-surface={variant === "plate" ? "raised" : undefined}
    >
      <div className="brand-section-heading__text">
        <Heading className="brand-section-heading__title">{title}</Heading>
        <TricolorDivider />
        {description === undefined ? null : (
          <p className="brand-section-heading__description">{description}</p>
        )}
      </div>
      {action === undefined ? null : (
        <div className="brand-section-heading__action">{action}</div>
      )}
    </header>
  );
};
