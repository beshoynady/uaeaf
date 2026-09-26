"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FOCUS_RING } from "@/components/ui/interactive";
import type { LocalizedText } from "@/lib/api/types";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The approved composition draws four priorities under the quote, and the
 *  API holds no more (`MAX_PRIORITIES`). */
const PRIORITY_SLOTS = 4;

const hasWriting = (text: LocalizedText): boolean => text.ar.trim() !== "" || text.en.trim() !== "";

/**
 * The words of the leadership panel: its two headings, the president's quote,
 * and the priorities listed under it.
 *
 * No standfirst, no picture and no visibility switch. The portrait, the names
 * and the titles belong to Board Members and Committees, and the section
 * follows that source rather than a switch (ADR-0101): it prints while at
 * least one person is serving in the current cycle. Automatic describes the
 * people, not the words. The quote and the priorities are ordinary content,
 * edited here like any other.
 *
 * ── Four slots, not a list ────────────────────────────────────────────────
 *
 * An add-and-remove list would only ever arrive at the same four, so the
 * slots are drawn outright, each empty until it is written. The editor sees
 * the shape of the panel they are filling rather than a button that builds it.
 */
export const LeadershipFields = ({ value, patch, disabled, locale }: SectionFieldsProps<"leadership">) => {
  const t = useTranslations("AboutFederation");
  const slots = Array.from({ length: PRIORITY_SLOTS }, (_, index) => value.priorities[index] ?? emptyText());

  const patchPriority = (index: number, change: Partial<LocalizedText>) => {
    const next = slots.map((priority, position) => (position === index ? { ...priority, ...change } : priority));
    // Kept up to the last written slot and no further. The slots are a drawing
    // of the composition, not four stored rows, and the API refuses a blank
    // pair; an untouched slot at the end must never reach the save as one. A
    // blank slot between two written ones stays where it is, so nothing moves
    // under the caret while the editor types.
    patch({ priorities: next.slice(0, next.findLastIndex(hasWriting) + 1) });
  };

  return (
    <>
      <SectionHeadings
        idPrefix="about-leadership"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription={false}
      />

      <BilingualField
        id="about-leadership-quote"
        labelAr={t("leadership.quote")}
        labelEn={t("leadership.quote")}
        valueAr={value.quote.ar}
        valueEn={value.quote.en}
        onChangeAr={(ar) => patch({ quote: { ...value.quote, ar } })}
        onChangeEn={(en) => patch({ quote: { ...value.quote, en } })}
        disabled={disabled}
        required
        multiline
        hint={t("leadership.quoteHint")}
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="text-label font-bold">{t("leadership.priorities")}</legend>
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("leadership.prioritiesHint")}</p>

        {slots.map((priority, index) => (
          // Keyed by position: the slots are fixed and never change places.
          <BilingualField
            key={index}
            id={`about-leadership-priority-${index}`}
            labelAr={t("leadership.priority", { number: index + 1 })}
            labelEn={t("leadership.priority", { number: index + 1 })}
            valueAr={priority.ar}
            valueEn={priority.en}
            onChangeAr={(ar) => patchPriority(index, { ar })}
            onChangeEn={(en) => patchPriority(index, { en })}
            disabled={disabled}
          />
        ))}
      </fieldset>

      {/* A note rather than disabled fields: there is nothing here to edit,
          and inputs that can never be typed into read as a permission the
          editor lacks rather than as data that lives somewhere else. */}
      <div
        role="note"
        aria-labelledby="about-leadership-source-title"
        className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-semantic-info)_10%,transparent)] px-3.5 py-3 text-label leading-relaxed text-[color:var(--color-semantic-info-text)]"
      >
        <InfoIcon />
        <div className="flex flex-col gap-1">
          <p id="about-leadership-source-title" className="font-bold">
            {t("leadership.sourceTitle")}
          </p>
          <p>{t("leadership.sourceBody")}</p>
          <p>
            <Link
              href={`/${locale}/board-members`}
              className={`rounded-[var(--radius-sm)] font-semibold underline ${FOCUS_RING}`}
            >
              {t("leadership.sourceLink")}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

/* Lucide path, inlined per ADR-0068 D6.1 — no icon library. */

const InfoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="mt-0.5 shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </svg>
);
