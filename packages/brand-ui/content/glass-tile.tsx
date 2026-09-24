import type { ReactNode } from "react";

export type GlassTileProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Decorative: the title carries the meaning. */
  icon?: ReactNode;
  className?: string;
};

/**
 * A translucent tile for standing on a coloured ground.
 *
 * Chapter 27 §27 permits glass "used sparingly and only for functional
 * legibility, never decoratively" — and that is exactly the job here: a values
 * card on the green section needs to read as its own object without punching
 * an opaque white hole in the ground.
 *
 * No `backdrop-filter`. The blur that makes "glassmorphism" expensive buys
 * nothing over a flat ground, and it is the one property on this page that
 * would cost a repaint on scroll. The tile is a translucent fill and a
 * translucent edge, both published by the surface — so on a light ground it
 * becomes a plate with a real border rather than disappearing.
 *
 * Server Component.
 */
export const GlassTile = ({ title, description, icon, className }: GlassTileProps) => (
  <article className={["brand-glass-tile", className].filter(Boolean).join(" ")}>
    {icon === undefined ? null : (
      <span className="brand-glass-tile__icon" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3 className="brand-glass-tile__title">{title}</h3>
    {description === undefined ? null : (
      <p className="brand-glass-tile__description">{description}</p>
    )}
  </article>
);
