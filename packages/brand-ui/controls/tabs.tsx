"use client";

import { useId, useRef } from "react";
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
  /**
   * Prefix for the generated `id` / `aria-controls` pair.
   *
   * Defaults to a `useId()` value, so two tab rows on one screen cannot collide.
   * The default was not always here: the ids were the literal `tab-<item id>`,
   * and a form with two bilingual fields produced two elements both called
   * `tab-ar` — a duplicate id, and `aria-controls` pointing at whichever the
   * browser found first. Pass an explicit prefix only when a panel rendered
   * elsewhere has to name the same id.
   */
  idPrefix?: string;
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
 * **Direction.** `ArrowRight` advances in English and retreats in Arabic. The
 * arrow keys are physical, the tab order is logical, and mapping one to the
 * other is the component's job — a row of tabs where the right arrow walks
 * backwards is the kind of defect that only shows up in the language nobody
 * tested. The direction is read from the element itself, so a single `dir`
 * attribute anywhere above it is enough.
 *
 * **Home and End** jump to the first and last tab, which the pattern requires
 * and which matters most on the longest rows.
 *
 * **Focus follows selection.** Moving with an arrow selects, and selection moves
 * focus to the newly selected tab — otherwise focus stays on a tab that is no
 * longer the one reachable by Tab, and the next Tab press leaves the row from
 * the wrong place.
 *
 * `'use client'` is earned: real state, real handler, real key handling.
 */
export const Tabs = ({
  items,
  activeId,
  onSelect,
  label,
  idPrefix,
  className,
}: TabsProps) => {
  const generated = useId();
  const prefix = idPrefix ?? generated;
  const list = useRef<HTMLDivElement>(null);

  /**
   * Select a tab by index and put focus on it.
   *
   * The focus move reads the DOM rather than waiting for a re-render: the
   * selected tab is the only one with `tabIndex={0}`, and after an arrow press
   * that is the tab the reader expects to be on.
   */
  const select = (index: number) => {
    const item = items[index];
    if (!item) return;
    onSelect(item.id);
    list.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${prefix}-tab-${item.id}`)}`)?.focus();
  };

  const move = (delta: number) => {
    const index = items.findIndex((item) => item.id === activeId);
    if (index === -1) return;
    // Wraps at both ends, which is what the pattern asks for: a reader holding
    // the arrow key should cycle rather than stop at a wall.
    select((index + delta + items.length) % items.length);
  };

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={["brand-tabs", className].filter(Boolean).join(" ")}
      onKeyDown={(event) => {
        // `getComputedStyle`, not `element.dir`: the attribute is usually set on
        // `<html>` and reads as "" on every element below it.
        const rtl =
          list.current !== null &&
          getComputedStyle(list.current).direction === "rtl";
        const forward = rtl ? -1 : 1;

        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(forward);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-forward);
        } else if (event.key === "ArrowDown") {
          // The block axis does not mirror between these two languages.
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          select(0);
        } else if (event.key === "End") {
          event.preventDefault();
          select(items.length - 1);
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
            id={`${prefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${item.id}`}
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
