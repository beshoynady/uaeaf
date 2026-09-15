import type { CSSProperties } from "react";
import { ValueIcon } from "@/lib/icons/value-icons";

/**
 * An item of a closed set: the card the goals and the values are printed on
 * (ADR-0072 D1).
 *
 * - Its colour follows its position. The first four items take the four item
 *   colours in order and the fifth starts again, so no two neighbours share a
 *   colour in one, two or three columns. The number and the title tell the
 *   cards apart; colour is the second cue (WCAG 1.4.1) and never a category.
 * - Ground, number and icon come from the item's tokens; the title and the
 *   description from the text tiers those tokens are measured against. Light
 *   and dark draw no edge, high contrast draws a black one.
 * - Not a link: no lift and no arrow, because a sign of "go" on something that
 *   does nothing misleads.
 * - The number is decorative for assistive technology, which already hears the
 *   position from the `ol` the goals are listed in.
 */

export type ItemTone = 1 | 2 | 3 | 4;

export const itemTone = (index: number): ItemTone => ((index % 4) + 1) as ItemTone;

/** Written out in full: Tailwind reads class names from source text, and a
 *  name assembled at runtime produces no CSS (ADR-0059 §D5). */
const TONES: Record<ItemTone, { card: string; ink: string }> = {
  1: {
    card: "border-[color:var(--color-item-1-edge)] bg-[color:var(--color-item-1-surface)]",
    ink: "text-[color:var(--color-item-1-ink)]",
  },
  2: {
    card: "border-[color:var(--color-item-2-edge)] bg-[color:var(--color-item-2-surface)]",
    ink: "text-[color:var(--color-item-2-ink)]",
  },
  3: {
    card: "border-[color:var(--color-item-3-edge)] bg-[color:var(--color-item-3-surface)]",
    ink: "text-[color:var(--color-item-3-ink)]",
  },
  4: {
    card: "border-[color:var(--color-item-4-edge)] bg-[color:var(--color-item-4-surface)]",
    ink: "text-[color:var(--color-item-4-ink)]",
  },
};

/** The ink of an item, for a numeral that belongs to a closed set but not to a card. */
export const itemInk = (tone: ItemTone): string => TONES[tone].ink;

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

export const ItemCard = ({
  tone,
  number = null,
  iconKey = null,
  title,
  description,
  field = false,
  className = "",
}: {
  tone: ItemTone;
  /** Two digits, where the set is ordered (the goals). */
  number?: string | null;
  /** One of the twelve keys; nothing is drawn for none or an unknown one. */
  iconKey?: string | null;
  title: string;
  description: string;
  /** Marks the title and the description for the stored-text comparison. */
  field?: boolean;
  className?: string;
}) => {
  const heading = (
    <h3 data-part={field ? "title" : undefined} className="text-h4 text-balance text-[color:var(--color-text-primary)]">
      {title}
    </h3>
  );

  return (
    <li
      data-reveal=""
      data-item-tone={tone}
      className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border p-6 text-start md:p-8 ${TONES[tone].card} ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        {number ? (
          <span
            aria-hidden="true"
            data-item-number=""
            data-reveal-part="rise"
            className={`text-display-l tabular-nums ${TONES[tone].ink}`}
          >
            {number}
          </span>
        ) : (
          <div data-reveal-part="rise" className="min-w-0">
            {heading}
          </div>
        )}
        {iconKey ? (
          <span data-item-icon="" data-reveal-part="chip" style={revealStep(1)} className={`flex shrink-0 ${TONES[tone].ink}`}>
            <ValueIcon iconKey={iconKey} className="size-8" />
          </span>
        ) : null}
      </div>
      <div data-reveal-part="rise" style={revealStep(2)}>
        {number ? heading : null}
        <p
          data-part={field ? "description" : undefined}
          className={`${number ? "mt-2 " : ""}text-body-sm text-pretty text-[color:var(--color-text-secondary)]`}
        >
          {description}
        </p>
      </div>
    </li>
  );
};
