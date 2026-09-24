import type { ReactNode } from "react";

import { BrandAccentBar } from "../accent/brand-accent-bar";

export type InfoCardProps = {
  /** Decorative: the label carries the meaning. */
  icon?: ReactNode;
  label: ReactNode;
  /** The value. A phone number, an address, an opening time. */
  value: ReactNode;
  /** Where the value leads, when it is actionable — a `tel:` or a map link. */
  href?: string;
  /** The identity edge along the top. Used on a contact page's card row. */
  accent?: boolean;
  className?: string;
};

/**
 * An icon, a label and a value, on the neutral plate.
 *
 * The contact page's information cards and the same shape wherever a screen
 * states a fact rather than links to a page. Distinct from `StatCard`, which
 * exists for a *figure* and sizes itself around one; this one is for a value
 * that happens to be text.
 *
 * `data-surface="raised"` because it paints its own plate: without it, a row
 * of these inside a coloured section would inherit that section's white ink
 * onto their own white ground.
 *
 * Server Component.
 */
export const InfoCard = ({
  icon,
  label,
  value,
  href,
  accent = false,
  className,
}: InfoCardProps) => (
  <div
    className={["brand-info-card", className].filter(Boolean).join(" ")}
    data-surface="raised"
  >
    {accent ? <BrandAccentBar className="brand-info-card__edge" /> : null}
    <div className="brand-info-card__body">
      {icon === undefined ? null : (
        <span className="brand-info-card__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="brand-info-card__text">
        <p className="brand-info-card__label">{label}</p>
        {href === undefined ? (
          <p className="brand-info-card__value">{value}</p>
        ) : (
          <a className="brand-info-card__value brand-info-card__link" href={href}>
            {value}
          </a>
        )}
      </div>
    </div>
  </div>
);
