"use client";

import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: ReactNode;
  /** Shown beside the label. Omitted when the count is unknown. */
  count?: number;
};

export type TabsProps = {
  items: readonly TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Names the tab set for assistive technology. Required — a tablist with no
   *  name is one of several on a screen with no way to tell them apart. */
  label: string;
  className?: string;
};

/**
 * A tab row whose selected tab carries the tricolour.
 *
 * The WAI-ARIA tabs pattern, with the roles that make it one: `tablist`,
 * `tab`, and `aria-selected` on each. The selected tab is marked by the
 * tricolour rule **and** by `aria-selected` — never by the rule alone, which
 * would be colour-only state (WCAG 1.4.1).
 *
 * Roving `tabindex`: only the selected tab is reachable by Tab, and the arrow
 * keys move between them. That is what the pattern specifies, and it is why a
 * tab row does not cost a keyboard user one Tab stop per tab.
 *
 * `'use client'` is earned: real state, real handler, real key handling.
 */
export const Tabs = ({ items, activeId, onSelect, label, className }: TabsProps) => {
  const move = (delta: number) => {
    const index = items.findIndex((item) => item.id === activeId);
    if (index === -1) return;
    // Wraps at both ends, which is what the pattern asks for: a reader holding
    // the arrow key should cycle rather than stop at a wall.
    const next = items[(index + delta + items.length) % items.length];
    onSelect(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={["brand-tabs", className].filter(Boolean).join(" ")}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            className="brand-tabs__tab"
            onClick={() => onSelect(item.id)}
          >
            <span className="brand-tabs__label">{item.label}</span>
            {item.count === undefined ? null : (
              <span className="brand-tabs__count">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
