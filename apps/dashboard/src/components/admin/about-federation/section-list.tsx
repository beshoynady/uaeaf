"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
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

  return (
    <ol className="flex flex-col gap-2">
      {SECTION_ORDER.map((key, index) => {
        const readiness = sections.find((section) => section.key === key);
        const isSelected = key === selected;

        return (
          <li key={key}>
            <div
              className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 ${
                isSelected
                  ? "border-[color:var(--color-brand-green)] bg-[color:var(--color-surface-sunken)]"
                  : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-default)]"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 grow items-center gap-3 text-start"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(key)}
              >
                <span
                  className={`inline-flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-label font-bold ${
                    isSelected
                      ? "bg-[color:var(--color-brand-green)] text-[color:var(--color-text-on-brand)]"
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
          </li>
        );
      })}
    </ol>
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
  success: "bg-[color:var(--color-surface-success-subtle)] text-[color:var(--color-text-success)]",
  warning: "bg-[color:var(--color-surface-warning-subtle)] text-[color:var(--color-text-warning)]",
  danger: "bg-[color:var(--color-surface-danger-subtle)] text-[color:var(--color-text-danger)]",
  info: "bg-[color:var(--color-surface-info-subtle)] text-[color:var(--color-text-info)]",
  muted: "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]",
} as const;

const Badge = ({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) => (
  <span
    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${TONES[tone]}`}
  >
    {children}
  </span>
);
