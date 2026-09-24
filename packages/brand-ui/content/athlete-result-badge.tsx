import type { ReactNode } from "react";

export type AthleteResultBadgeProps = {
  name: ReactNode;
  /** Discipline, event, or whatever qualifies the result. */
  detail?: ReactNode;
  /** 1, 2 or 3. Anything else is not a podium and does not get a medal. */
  place: 1 | 2 | 3;
  /**
   * The localised word for the place, e.g. "المركز الأول" / "first place".
   *
   * The medal disc is `aria-hidden` and the numeral inside it is decorative, so
   * this is what actually carries the rank to a screen reader. Required,
   * because a medal that only exists as a colour and a digit in a circle is
   * colour-alone information (WCAG 1.4.1) for anyone not seeing it.
   */
  placeLabel: string;
  className?: string;
};

/**
 * A name bar on the red ground with a numbered medal disc.
 *
 * **Why this satisfies contrast without touching the medal tokens.** The medal
 * colours are a known contrast failure in this system. Here they are not
 * carrying text: the name is white on the red ground (5.88:1 at the gradient's
 * lightest stop), and the disc is a decorative mark whose rank is stated in
 * `placeLabel`. So nothing a reader must read is drawn in a medal colour, and
 * no medal token changes.
 *
 * The numeral inside the disc is redundant with `placeLabel` on purpose: a
 * sighted reader gets the rank from the numeral and the colour, and a screen
 * reader gets it from the label. Neither depends on the other.
 *
 * Server Component.
 */
export const AthleteResultBadge = ({
  name,
  detail,
  place,
  placeLabel,
  className,
}: AthleteResultBadgeProps) => (
  <div className={["brand-athlete-result", className].filter(Boolean).join(" ")}>
    <span className="brand-athlete-result__medal" data-place={place} aria-hidden="true">
      {place}
    </span>
    <span className="brand-athlete-result__text">
      <span className="brand-athlete-result__name">{name}</span>
      <span className="brand-visually-hidden">{placeLabel}</span>
      {detail === undefined ? null : (
        <span className="brand-athlete-result__detail">{detail}</span>
      )}
    </span>
  </div>
);
