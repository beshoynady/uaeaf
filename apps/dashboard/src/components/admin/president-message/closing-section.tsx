"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import type { SectionProps } from "./section-props";

/**
 * What sits under the message: the signature's role, and the date.
 *
 * The date is not a field. `presidentMessagePage` stores none — the message's
 * date is the date its Live publication was made (ADR-0069 D2), because two
 * stored dates can disagree and only one of them can be right. So this shows
 * where the date comes from instead of offering an input that would create
 * the second one.
 */
export function ClosingSection({ draft, onChange, disabled }: SectionProps) {
  const t = useTranslations("PresidentMessage");

  return (
    <>
      <BilingualField
        id="signatory-title"
        labelAr={t("labelAr", { label: t("signatoryTitle") })}
        labelEn={t("labelEn", { label: t("signatoryTitle") })}
        valueAr={draft.signatoryTitle.ar}
        valueEn={draft.signatoryTitle.en}
        onChangeAr={(ar) => onChange({ signatoryTitle: { ...draft.signatoryTitle, ar } })}
        onChangeEn={(en) => onChange({ signatoryTitle: { ...draft.signatoryTitle, en } })}
        disabled={disabled}
        required
      />

      {/* Not a disabled input. A disabled control says "you may not change
          this *yet*"; this value has no input at all, and saying so in words
          is the honest version of the same message. */}
      <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-4 py-3">
        <span className="text-label font-medium text-[color:var(--color-text-secondary)]">
          {t("publishDate")}
        </span>
        <span className="text-body text-[color:var(--color-text-primary)]">
          {t("publishDateDerived")}
        </span>
        <span className="text-caption text-[color:var(--color-text-muted)]">
          {t("publishDateNote")}
        </span>
      </div>
    </>
  );
}
