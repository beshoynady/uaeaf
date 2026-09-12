"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import type { SectionProps } from "./section-props";

/**
 * The pulled quote.
 *
 * A distinct editorial element, not the body's first sentence repeated: the
 * public page renders it at every breakpoint (defect PM-D03 was the tablet
 * layout dropping it), so an empty one leaves a visible gap rather than
 * quietly collapsing.
 *
 * Multi-line, because it is a sentence rather than a name — a single-line
 * input hides everything past its own width.
 */
export function QuoteSection({ draft, onChange, disabled }: SectionProps) {
  const t = useTranslations("PresidentMessage");

  return (
    <BilingualField
      id="pull-quote"
      multiline
      labelAr={t("labelAr", { label: t("pullQuote") })}
      labelEn={t("labelEn", { label: t("pullQuote") })}
      valueAr={draft.pullQuote.ar}
      valueEn={draft.pullQuote.en}
      onChangeAr={(ar) => onChange({ pullQuote: { ...draft.pullQuote, ar } })}
      onChangeEn={(en) => onChange({ pullQuote: { ...draft.pullQuote, en } })}
      hint={t("pullQuoteNote")}
      disabled={disabled}
    />
  );
}
