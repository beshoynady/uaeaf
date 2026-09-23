"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FOCUS_RING, TRANSITION } from "@/components/ui/interactive";

export interface LanguageTab {
  value: string;
  label: string;
  /** Whether this language has been written. Drawn as a mark on the tab, so
   *  the half that is still empty is visible without opening it — which is the
   *  whole cost of hiding one language behind the other. */
  complete: boolean;
  /** The same fact in words, for the tab's accessible name. The mark is a
   *  coloured dot, and a dot alone cannot carry meaning (WCAG 1.4.1). */
  statusLabel: string;
}

/**
 * Two halves of one bilingual field, one shown at a time.
 *
 * ── Why tabs here and columns elsewhere ────────────────────────────────────
 *
 * A headline is a few words and fits beside its translation; an article body
 * does not. Two editors side by side give each half a column roughly the
 * width of a phone, which is the wrong measure for prose in either language,
 * and every toolbar is drawn twice in the space one deserves. So long-form
 * text is tabbed and short fields stay side by side. That split is the rule,
 * not this component's private choice.
 *
 * ── Why both panels stay mounted ───────────────────────────────────────────
 *
 * The inactive panel is `hidden`, never unmounted. A rich-text editor holds
 * its own document, its history and its selection; unmounting it on every tab
 * change would throw all three away and make an undo stack that empties when
 * the author checks the other language. It also keeps whole-field comparisons
 * — the paragraph-count mismatch notice — able to see both halves at once,
 * which is the one thing a tabbed layout would otherwise break.
 *
 * ── Keyboard ───────────────────────────────────────────────────────────────
 *
 * The APG tabs pattern: arrows move between tabs, Home and End jump to the
 * ends, and only the selected tab is in the tab order, so Tab from the list
 * goes into the panel rather than along the tabs. The arrows follow the
 * reading direction — in Arabic, ArrowLeft moves forward — because a tab row
 * that moves right when the reader presses left is a control that disagrees
 * with the page it sits in.
 */
export const LanguageTabs = ({
  tabs,
  panel,
  label,
}: {
  tabs: readonly LanguageTab[];
  /** Rendered once per tab. All panels are rendered; inactive ones are
   *  hidden rather than dropped. */
  panel: (value: string) => ReactNode;
  /** Names the tab list, so a screen reader says what is being switched. */
  label: string;
}) => {
  const base = useId();
  const [active, setActive] = useState(tabs[0]?.value ?? "");
  const listRef = useRef<HTMLDivElement>(null);

  const tabId = (value: string) => `${base}-tab-${value}`;
  const panelId = (value: string) => `${base}-panel-${value}`;

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }
    event.preventDefault();

    const rtl = getComputedStyle(listRef.current ?? document.body).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const index = tabs.findIndex((tab) => tab.value === active);

    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === forward
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;

    const value = tabs[next]?.value;
    if (value) {
      setActive(value);
      // Selection follows focus, and focus follows selection: the tab the
      // arrow landed on must actually take the keyboard, or the next arrow
      // press would be read by whatever held it before.
      document.getElementById(tabId(value))?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={move}
        className="flex flex-wrap items-center gap-1 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-1"
      >
        {tabs.map((tab) => {
          const selected = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              id={tabId(tab.value)}
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(tab.value)}
              // Only the selected tab is reachable by Tab; the arrows move
              // within the list (APG).
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-4 text-label ${TRANSITION} ${FOCUS_RING} ${
                selected
                  ? "bg-[color:var(--color-surface-raised)] font-bold text-[color:var(--color-text-primary)] shadow-card"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-raised)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]"
              }`}
            >
              {tab.label}
              {/* The dot is the glance; the words beside it are what the fact
                  actually rests on, so it never depends on colour alone. */}
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${
                  tab.complete
                    ? "bg-[color:var(--color-brand-primary)]"
                    : "bg-[color:var(--color-border-strong)]"
                }`}
              />
              <span className="sr-only">{tab.statusLabel}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.value}
          id={panelId(tab.value)}
          role="tabpanel"
          aria-labelledby={tabId(tab.value)}
          // `hidden`, not unmounted: an editor holds its document, its history
          // and its selection, and all three would be thrown away on a tab
          // change. `tabIndex={0}` because a panel whose content is not itself
          // focusable must be reachable from its tab.
          hidden={tab.value !== active}
          tabIndex={0}
          className={FOCUS_RING}
        >
          {panel(tab.value)}
        </div>
      ))}
    </div>
  );
};
