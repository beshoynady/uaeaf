"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { FOCUS_RING } from "@/components/ui/interactive";
import { SwitchField } from "@/components/ui/switch-field";
import { AUTOMATIC_SECTIONS, HIDEABLE_SECTIONS, SECTION_ORDER } from "@/lib/admin/about-readiness";
import type { AboutSectionKey, SectionReadiness } from "@/lib/admin/about-readiness";

/**
 * The page's ten sections, numbered, in the order they are printed.
 *
 * ── Why there is no drag handle here ──────────────────────────────────────
 *
 * Section order is fixed in code and not stored (ADR-0101 D3). The order
 * carries the identity guide's colour cadence and the sequence the nine scroll
 * scenes are composed against, and an editor dragging a row can see neither.
 * So the control is absent rather than present-and-disabled: a disabled
 * handle invites someone to find out why, and the answer is "never".
 *
 * ── Three kinds of row ────────────────────────────────────────────────────
 *
 * - The **hero** carries a locked badge, because a page with no header is not
 *   a page.
 * - **Leadership** and **the ecosystem** carry an "automatic" badge naming
 *   what their source holds right now. They have no switch because the
 *   question is already answered by whether the board module lists anyone and
 *   whether any record could be counted — a switch there would either lie or
 *   do nothing.
 * - The **seven content sections** carry a real `role="switch"`.
 *
 * Every row also carries a readiness badge, which is the same computation the
 * pre-submission panel reads, so the two can never disagree.
 *
 * ── Why it is a vertical tablist ──────────────────────────────────────────
 *
 * One section is edited at a time (ADR-0102 §D1), so the rail is a set of tabs
 * and the editor beside it is their panel — not a list of links, which would
 * have a keyboard reader tab through ten rows to reach the eleventh control.
 * `aria-orientation="vertical"` is what tells them the arrows are up and down.
 *
 * The row wrapper carries `role="presentation"`, so each tab stays an effective
 * child of the tablist while still having the switch as a visual sibling. The
 * switch is deliberately NOT inside the tab: a control inside a control is one
 * click with two meanings, and toggling a section must not move the editor away
 * from the section they are working in.
 */
export const SectionList = ({
  sections,
  selected,
  hiddenSections,
  disabled,
  onSelect,
  onToggle,
}: {
  sections: readonly SectionReadiness[];
  selected: AboutSectionKey;
  hiddenSections: readonly AboutSectionKey[];
  disabled: boolean;
  onSelect: (key: AboutSectionKey) => void;
  /** Stable by construction — `SwitchField` is memoised and an inline arrow
   *  would re-render every switch on every keystroke elsewhere on the page. */
  onToggle: (key: AboutSectionKey, shown: boolean) => void;
}) => {
  const t = useTranslations("AboutFederation");
  const hidden = new Set(hiddenSections);

  const handleToggle = useCallback(
    (key: AboutSectionKey) => (shown: boolean) => onToggle(key, shown),
    [onToggle],
  );

  const rail = useRef<HTMLDivElement>(null);

  /** The tabs pattern's vertical keys. Up and down rather than left and right,
   *  and wrapping at both ends, so the rail is a ring — which is what
   *  `aria-orientation="vertical"` has already told the reader to expect.
   *  Unaffected by the writing direction: down is down in both. */
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SECTION_ORDER.indexOf(selected);
    if (index === -1) return;

    const step = (delta: number) => {
      event.preventDefault();
      onSelect(SECTION_ORDER[(index + delta + SECTION_ORDER.length) % SECTION_ORDER.length]);
    };

    switch (event.key) {
      case "ArrowDown":
        return step(1);
      case "ArrowUp":
        return step(-1);
      case "Home":
        event.preventDefault();
        return onSelect(SECTION_ORDER[0]);
      case "End":
        event.preventDefault();
        return onSelect(SECTION_ORDER[SECTION_ORDER.length - 1]);
      default:
        return undefined;
    }
  };

  return (
    <div
      ref={rail}
      role="tablist"
      aria-orientation="vertical"
      aria-label={t("sections.title")}
      onKeyDown={move}
      className="flex flex-col gap-2"
    >
      {SECTION_ORDER.map((key, index) => {
        const readiness = sections.find((section) => section.key === key);
        const isSelected = key === selected;

        return (
          <div
            key={key}
            role="presentation"
            data-section={key}
            className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 ${
              isSelected
                ? "border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-sunken)]"
                : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]"
            }`}
          >
              <button
                type="button"
                id={`about-section-tab-${key}`}
                role="tab"
                aria-selected={isSelected}
                aria-controls="about-section-panel"
                tabIndex={isSelected ? 0 : -1}
                className={`flex min-w-0 grow items-center gap-3 rounded-[var(--radius-sm)] text-start ${FOCUS_RING}`}
                onClick={() => onSelect(key)}
              >
                <span
                  className={`inline-flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-label font-bold ${
                    isSelected
                      ? "bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
                      : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-body font-semibold">{t(`section.${key}`)}</span>
                  {readiness ? <ReadinessBadge readiness={readiness} /> : null}
                </span>
              </button>

              {key === "hero" ? (
                <LockedBadge />
              ) : AUTOMATIC_SECTIONS.includes(key) ? (
                <AutomaticNote sectionKey={key} count={readiness?.sourceCount ?? 0} />
              ) : HIDEABLE_SECTIONS.includes(key) ? (
                <SwitchField
                  id={`about-show-${key}`}
                  label={t("section.show", { name: t(`section.${key}`) })}
                  labelHidden
                  checked={!hidden.has(key)}
                  disabled={disabled}
                  onChange={handleToggle(key)}
                />
              ) : null}
          </div>
        );
      })}
    </div>
  );
};

const ReadinessBadge = ({ readiness }: { readiness: SectionReadiness }) => {
  const t = useTranslations("AboutFederation");

  if (readiness.status === "hidden") {
    return <Badge tone="muted">{t("readiness.hidden")}</Badge>;
  }
  if (readiness.status === "translation") {
    return <Badge tone="danger">{t("readiness.translation", { count: readiness.missingTranslations })}</Badge>;
  }
  if (readiness.status === "images") {
    return <Badge tone="warning">{t("readiness.images", { count: readiness.missingImages })}</Badge>;
  }
  // A list-bearing section says how much of it prints, which is more use than
  // "complete" once an editor has started hiding items.
  if (readiness.hiddenItems !== undefined && readiness.hiddenItems > 0) {
    return (
      <Badge tone="warning">
        {t("readiness.counted", { shown: readiness.visibleItems ?? 0, hidden: readiness.hiddenItems })}
      </Badge>
    );
  }
  return <Badge tone="success">{t("readiness.complete")}</Badge>;
};

const AutomaticNote = ({ sectionKey, count }: { sectionKey: AboutSectionKey; count: number }) => {
  const t = useTranslations("AboutFederation");

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <Badge tone="info">{t("readiness.automatic", { count })}</Badge>
      <span className="text-caption text-[color:var(--color-text-muted)]">{t(`section.source.${sectionKey}`)}</span>
    </span>
  );
};

const LockedBadge = () => {
  const t = useTranslations("AboutFederation");

  return (
    <Badge tone="muted">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {t("section.alwaysShown")}
    </Badge>
  );
};

const TONES = {
  success: "bg-[color-mix(in_srgb,var(--color-semantic-success)_10%,transparent)] text-[color:var(--color-semantic-success-text)]",
  warning: "bg-[color-mix(in_srgb,var(--color-semantic-warning)_10%,transparent)] text-[color:var(--color-semantic-warning-text)]",
  danger: "bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] text-[color:var(--color-semantic-error-text)]",
  info: "bg-[color-mix(in_srgb,var(--color-semantic-info)_10%,transparent)] text-[color:var(--color-semantic-info-text)]",
  muted: "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]",
} as const;

const Badge = ({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) => (
  <span
    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${TONES[tone]}`}
  >
    {children}
  </span>
);
