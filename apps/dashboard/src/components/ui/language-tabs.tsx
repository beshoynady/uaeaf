"use client";

import { useId, useState, type ReactNode } from "react";
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
 * `aria-selected`. What is left here is the part that is about bilingual
 * editing and not about tabs: both panels stay mounted, each tab shows whether
 * its language has been written, and the panel is rendered once per language.
 *
 * Three things used to be worked around here and are now the library's:
 * ids unique per instance (`idPrefix`), focus following selection, and Home and
 * End. Its arrows follow reading direction too. This file passes the prefix so
 * that it can name the panel ids that the library's `aria-controls` points at.
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

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Tabs
          label={label}
          idPrefix={base}
          activeId={active}
          onSelect={setActive}
          items={tabs.map((tab) => ({
            id: tab.value,
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
          // The library builds `<prefix>-tab-<id>` for each tab; these two name
          // the other half of that pair with the same prefix.
          id={`${base}-panel-${tab.value}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${tab.value}`}
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
