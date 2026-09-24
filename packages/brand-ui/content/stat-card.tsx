import type { ReactNode } from "react";

/**
 * What the figure means, which is what colours it.
 *
 * Not a palette: each tone is a role the reader can decode. `neutral` is a
 * plain count, `action` something waiting on them, `attention` something
 * overdue, `positive` something finished. A count with no meaning takes
 * `neutral` — a colour chosen because the card looked plain is the decoration
 * ADR-0065 R2 removes.
 */
export type StatTone = "neutral" | "action" | "attention" | "positive" | "live";

export type StatCardProps = {
  /** Already formatted for the locale — digits, separators and all. */
  value: string;
  label: ReactNode;
  /** A short qualifier under the label: "this week", "awaiting review". */
  detail?: ReactNode;
  tone?: StatTone;
  /** Where the card leads, if it leads anywhere. */
  href?: string;
  className?: string;
};

/**
 * One figure, its meaning, and a rule that draws itself on hover.
 *
 * The most repeated pattern in the product: six on the dashboard's news
 * screen alone, and every overview and list screen wants a row of them. It
 * was written locally each time before this existed.
 *
 * The figure is large and the tone is a *border*, never a fill: a wall of
 * filled colour tiles is the "everywhere faintly" failure, and a filled tile
 * puts the figure on a coloured ground where only white ink would pass. The
 * size carries the emphasis; the colour carries the meaning.
 *
 * Server Component. The draw line is CSS.
 */
export const StatCard = ({
  value,
  label,
  detail,
  tone = "neutral",
  href,
  className,
}: StatCardProps) => {
  const classes = ["brand-stat-card", "brand-draw-line", className].filter(Boolean).join(" ");
  const body = (
    <>
      <p className="brand-stat-card__value">{value}</p>
      <p className="brand-stat-card__label">{label}</p>
      {detail === undefined ? null : <p className="brand-stat-card__detail">{detail}</p>}
    </>
  );

  return href === undefined ? (
    <div className={classes} data-tone={tone}>
      {body}
    </div>
  ) : (
    <a className={classes} data-tone={tone} href={href}>
      {body}
    </a>
  );
};
