"use client";

import type { ReactNode } from "react";

export type FilterChipProps = {
  label: ReactNode;
  /**
   * How many items this filter would show. Omitted rather than zero when the
   * count is genuinely unknown — a "0" that means "not loaded yet" is a number
   * a reader will believe.
   */
  count?: number;
  /**
   * The localised unit for `count`, e.g. "وثيقة" / "documents". Required
   * whenever a count is shown, and rendered for assistive technology only.
   *
   * Hiding the number from a screen reader instead was the first version of
   * this component, and it was wrong: the count is information a sighted user
   * gets and a screen-reader user then does not. Announcing the bare number is
   * no better — "Regulations 12" is a sentence with a missing noun. So the
   * number stays in the accessibility tree and the unit travels with it, in
   * the caller's language.
   */
  countLabel?: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
};

/**
 * A filter as a toggle, not a link.
 *
 * `'use client'` is earned here: there is a real handler and real state above
 * it. Everything visual is still CSS.
 *
 * `aria-pressed` rather than `aria-current`: this is a control whose state is
 * on or off, not a location in a set. A screen-reader user hears "pressed",
 * which is what a selected filter is.
 *
 * The selected state is solid green **and** a pressed state — never colour
 * alone (Chapter 6 §6.2, WCAG 1.4.1). Its border also clears 3:1 against the
 * surface, so a reader who cannot distinguish the fill still sees the edge.
 */
export const FilterChip = ({
  label,
  count,
  countLabel,
  selected,
  onSelect,
  className,
}: FilterChipProps) => (
  <button
    type="button"
    className={["brand-filter-chip", "brand-ring", className].filter(Boolean).join(" ")}
    aria-pressed={selected}
    onClick={onSelect}
  >
    <span className="brand-filter-chip__label">{label}</span>
    {count === undefined ? null : (
      <span className="brand-filter-chip__count">
        {count}
        {countLabel === undefined ? null : (
          <span className="brand-visually-hidden"> {countLabel}</span>
        )}
      </span>
    )}
  </button>
);
