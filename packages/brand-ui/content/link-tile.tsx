import Link from "next/link";
import type { ElementType, ReactNode } from "react";

export type LinkTileProps = {
  title: ReactNode;
  description?: ReactNode;
  href: string;
  /**
   * The component that renders the href.
   *
   * Defaults to `next/link`, which is wrong for an internal route in this
   * project: `localePrefix: "always"` leaves `/about/committees` without a
   * locale, and the middleware then supplies one from a cookie — so a reader on
   * the English page can be sent to Arabic. Every internal tile passes the
   * application's locale-aware `Link` here.
   */
  linkComponent?: ElementType;
  className?: string;
};

/**
 * A link as a tile, for the two brand grounds.
 *
 * Why this exists rather than a card: on `brand-green` and `brand-red` a card's
 * neutral plate would punch a white hole in the ground, and a bordered card
 * would need a border colour that reads on a gradient. This tile instead uses
 * the ground itself — a translucent white fill and a translucent white edge,
 * both measured against the gradient's *lightest* stop, which is where a
 * translucent white is hardest to see.
 *
 * The arrow is the one glyph here that has to follow reading direction, and it
 * does so through a CSS logical transform rather than two characters — so
 * there is no string to forget to mirror.
 *
 * Server Component.
 */
export const LinkTile = ({
  title,
  description,
  href,
  linkComponent: Anchor = Link,
  className,
}: LinkTileProps) => (
  <Anchor href={href} className={["brand-link-tile", className].filter(Boolean).join(" ")}>
    <span className="brand-link-tile__text">
      <span className="brand-link-tile__title">{title}</span>
      {description === undefined ? null : (
        <span className="brand-link-tile__description">{description}</span>
      )}
    </span>
    <span className="brand-link-tile__arrow" aria-hidden="true">
      &rarr;
    </span>
  </Anchor>
);
