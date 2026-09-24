"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UiIcon } from "@/lib/icons/ui-icons";
import { BUTTON_ICON } from "./interactive";

/**
 * The actions on one row, behind a single button.
 *
 * -- Why a menu and not four buttons ----------------------------------------
 *
 * Four buttons in every row is four tab stops per row — forty on a ten-row
 * table — and the row grows tall enough to lose the scanning rhythm the table
 * exists for. One button is one stop, and the actions are read out only by
 * someone who asked for them.
 *
 * -- The keyboard contract this implements ----------------------------------
 *
 * `role="menu"` is a promise, and these are the parts of it that break silently
 * when skipped:
 *
 * - **Arrow keys move between items**, and only one item is in the tab order
 *   (a roving `tabIndex`). Without it, Tab walks the menu and Tab also leaves
 *   it, which is two different meanings for one key.
 * - **Home and End** jump to the ends.
 * - **Escape closes and returns focus to the trigger** — not to the body,
 *   which is where a reader ends up re-finding their place in a long table.
 * - **A press outside closes it.**
 * - **Opening moves focus to the first item**, so the menu is usable without
 *   a second keystroke to enter it.
 *
 * -- Placement -------------------------------------------------------------
 *
 * Anchored to the trigger's `end` edge and opening inward, for the reason the
 * library's filter panel was moved: the trigger sits in the last column, so a
 * panel anchored at its `start` hangs off the page in Arabic.
 */

export interface RowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** Drawn in the danger colour and separated from the rest. */
  danger?: boolean;
  disabled?: boolean;
}

export const RowMenu = ({ label, items }: { label: string; items: readonly RowMenuItem[] }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const enabled = items.filter((item) => !item.disabled);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  // Focus the active item whenever it changes while open, which is also what
  // puts focus into the menu when it opens.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return;
      // No focus return: the reader pressed somewhere else, and pulling focus
      // back to the trigger would take it away from what they just pressed.
      close(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      // A menu is not part of the page's tab order once open: Tab closes it
      // and lets the browser move on from the trigger.
      close(false);
      return;
    }
    const last = enabled.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    }
  };

  return (
    <div className="relative flex justify-end">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setActive(0);
          setOpen((was) => !was);
        }}
        onKeyDown={(event) => {
          // Down-arrow opens and lands on the first item, as a menu button does
          // everywhere else.
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(0);
            setOpen(true);
          }
        }}
        // The shared icon-button recipe rather than a hand-rolled copy of it:
        // the copy was missing the pressed state, which is the one state a
        // touch device can actually show.
        className={BUTTON_ICON}
      >
        <UiIcon name="more-horizontal" className="size-[var(--icon-size-sm)]" />
      </button>

      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute end-0 top-full z-20 mt-1 flex min-w-48 flex-col rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] py-1 shadow-card"
        >
          {enabled.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              // Roving: one stop for the whole menu, arrows move within it.
              tabIndex={index === active ? 0 : -1}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className={`flex min-h-11 items-center px-4 text-start text-body-sm transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--a11y-focus-ring)] active:bg-[color:var(--color-surface-skeleton)] ${
                item.danger
                  ? "text-[color:var(--color-semantic-error)] hover:bg-[color-mix(in_srgb,var(--color-semantic-error)_8%,transparent)]"
                  : "text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-sunken)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
