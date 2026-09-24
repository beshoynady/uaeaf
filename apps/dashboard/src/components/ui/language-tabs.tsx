"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Tabs } from "@uaeaf/brand-ui";
import { FOCUS_RING } from "@/components/ui/interactive";

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
 * goes into the panel rather than along the tabs.
 *
 * ── Why the library's `Tabs` is wrapped rather than used bare ──────────────
 *
 * The tab row is the shared library's (Chapter 12 §12.15: language switchers
 * become `Tabs`), so the selected language carries the tricolour rule *and*
 * `aria-selected`. Three things this component already did are not in the
 * library's version, and dropping them would be a regression, so they stay
 * here around it:
 *
 * - **Unique ids.** The library derives `tab-<id>` and `panel-<id>` from the
 *   item id. Two bilingual fields on one form would both produce `tab-ar`, so
 *   each id is prefixed with this instance's `useId()`.
 * - **Focus follows selection.** The library moves the selection on an arrow
 *   press and leaves focus where it was — on a tab that has just left the tab
 *   order. The newly selected tab takes focus here.
 * - **Home and End.** Not handled by the library; the key press bubbles out of
 *   its tablist to the wrapper below.
 *
 * The library's arrows do not follow reading direction (ArrowRight is always
 * "next"). With exactly two languages next and previous are the same tab, so
 * nothing a reader can press behaves differently here; a third tab would
 * expose it, and the fix belongs in the library.
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

  // The id the library is given; it derives `tab-…` and `panel-…` from it.
  const itemId = (value: string) => `${base}-${value}`;
  const valueOf = (id: string) => tabs.find((tab) => itemId(tab.value) === id)?.value;

  const select = (value: string) => {
    setActive(value);
    // Selection follows focus, and focus follows selection: the tab the
    // arrow landed on must actually take the keyboard, or the next arrow
    // press would be read by whatever held it before.
    document.getElementById(`tab-${itemId(value)}`)?.focus();
  };

  const jump = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const value = (event.key === "Home" ? tabs[0] : tabs[tabs.length - 1])?.value;
    if (value) {
      select(value);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div onKeyDown={jump}>
        <Tabs
          label={label}
          activeId={itemId(active)}
          onSelect={(id) => {
            const value = valueOf(id);
            if (value) {
              select(value);
            }
          }}
          items={tabs.map((tab) => ({
            id: itemId(tab.value),
            label: (
              <>
                {tab.label}
                {/* The dot is the glance; the words beside it are what the
                    fact actually rests on, so it never depends on colour
                    alone. */}
                <span
                  aria-hidden="true"
                  className={`ms-2 inline-block size-1.5 shrink-0 rounded-full align-middle ${
                    tab.complete
                      ? "bg-[color:var(--color-brand-primary)]"
                      : "bg-[color:var(--color-border-strong)]"
                  }`}
                />
                <span className="sr-only">{tab.statusLabel}</span>
              </>
            ),
          }))}
        />
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.value}
          id={`panel-${itemId(tab.value)}`}
          role="tabpanel"
          aria-labelledby={`tab-${itemId(tab.value)}`}
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
