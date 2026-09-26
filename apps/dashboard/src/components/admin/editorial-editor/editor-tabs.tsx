"use client";

import { useRef, type KeyboardEvent } from "react";

/** One tab. `count` is drawn as a badge and read as part of the tab's name. */
export interface EditorTabSpec {
  id: string;
  label: string;
  count?: number;
  /** `warning` for outstanding work a reader has to clear; the default is the
   *  quiet count of something that merely exists. */
  tone?: "warning" | "neutral";
}

/** The panel a tab controls, and the tab a panel is labelled by. One pair of
 *  ids, derived from the tab's own id so a panel cannot be wired to the wrong
 *  tab. */
export const tabId = (id: string) => `editor-tab-${id}`;
export const panelId = (id: string) => `editor-panel-${id}`;

/**
 * The editor's tab strip (ADR-0102 §D1).
 *
 * ── The keyboard ──────────────────────────────────────────────────────────
 *
 * The WAI-ARIA tabs pattern, with one adaptation that is not optional here: the
 * arrows follow the **writing direction**. The dashboard's default locale is
 * Arabic, so the next tab is to the left, and `element.dir` reads `""` on an
 * element that inherits its direction — so the direction is read from the
 * computed style at the moment the key is pressed, never from an attribute or a
 * locale prop this component would have to be told.
 *
 * `tabIndex` is 0 on the selected tab and -1 on the rest, so the strip is one
 * tab stop: a keyboard reader passes it in one press instead of four, and moves
 * *within* it with the arrows.
 *
 * ── Overflow ──────────────────────────────────────────────────────────────
 *
 * The strip scrolls horizontally rather than wrapping. Four tabs do not fit a
 * 390px screen, and a wrapped strip changes the header's height as the reader
 * moves between pages with different tabs — a layout shift on a sticky element,
 * which is the one place it is most visible.
 */
export const EditorTabs = ({
  tabs,
  selected,
  onSelect,
  label,
}: {
  tabs: readonly EditorTabSpec[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}) => {
  const list = useRef<HTMLDivElement>(null);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === selected);
    if (index === -1) return;

    // Resolved here, not from a prop: `getComputedStyle` is the only reading
    // that is right for an element inheriting its direction from an ancestor.
    const rtl =
      typeof window !== "undefined" && list.current
        ? window.getComputedStyle(list.current).direction === "rtl"
        : false;

    const step = (delta: number) => {
      event.preventDefault();
      // Wraps at both ends: the strip is a ring, as the pattern specifies.
      onSelect(tabs[(index + delta + tabs.length) % tabs.length].id);
    };

    switch (event.key) {
      case "ArrowLeft":
        return step(rtl ? 1 : -1);
      case "ArrowRight":
        return step(rtl ? -1 : 1);
      case "Home":
        event.preventDefault();
        return onSelect(tabs[0].id);
      case "End":
        event.preventDefault();
        return onSelect(tabs[tabs.length - 1].id);
      default:
        return undefined;
    }
  };

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={move}
      className="flex gap-1 overflow-x-auto border-b border-[color:var(--color-border-default)] [scrollbar-width:thin]"
    >
      {tabs.map((tab) => {
        const on = tab.id === selected;
        return (
          <button
            key={tab.id}
            type="button"
            id={tabId(tab.id)}
            role="tab"
            aria-selected={on}
            aria-controls={panelId(tab.id)}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            // The weight lives in the conditional ONLY. A `font-semibold` in the
            // base string and a `font-extrabold` in the branch are two classes
            // of equal specificity, so the winner is whichever Tailwind emits
            // later in the stylesheet — not whichever is later in this
            // attribute. It was semibold: the selected tab measured 600, and
            // the canvas asks for the heavier weight that makes it findable at
            // a glance.
            className={`relative inline-flex h-12 shrink-0 items-center gap-2 border-none bg-transparent px-4 text-body transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
              on
                ? "font-extrabold text-[color:var(--color-text-primary)]"
                : "font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-sunken)] active:text-[color:var(--color-text-primary)]"
            }`}
          >
            {tab.label}

            {tab.count === undefined ? null : (
              <span
                className={`inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-[var(--radius-full)] px-1.5 text-caption font-extrabold tabular-nums ${
                  tab.tone === "warning"
                    ? "bg-[color-mix(in_srgb,var(--color-semantic-warning)_18%,transparent)] text-[color:var(--color-semantic-warning-text)]"
                    : "bg-[color:var(--color-surface-skeleton)] text-[color:var(--color-text-secondary)]"
                }`}
              >
                {tab.count}
              </span>
            )}

            {/* The identity's three colours under the selected tab, from the
                approved `--brand-tricolor` token rather than a gradient written
                out here: the mark is the federation's and it is defined once.
                A free-standing element rather than a border so the strip's own
                bottom rule stays a single unbroken line behind it. */}
            {on ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-px h-[var(--border-width-ring)] rounded-t-[var(--radius-full)]"
                style={{ background: "var(--brand-tricolor)" }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
