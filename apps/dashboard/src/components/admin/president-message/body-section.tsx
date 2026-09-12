"use client";

import { useTranslations } from "next-intl";
import { LazyBilingualRichText } from "@/components/admin/rich-text/lazy-rich-text";
import type { SectionProps } from "./section-props";

/**
 * The message itself, in both languages side by side.
 *
 * Reached through `lazy-rich-text`, never through the editor module
 * directly: TipTap and ProseMirror are ~123 KB compressed, and this is the
 * only screen on the dashboard that needs them. Importing the editor here
 * would put them in the bundle every other screen downloads.
 */
export function BodySection({ draft, onChange, disabled }: SectionProps) {
  const t = useTranslations("PresidentMessage");

  return (
    <LazyBilingualRichText
      id="message-body"
      labelAr={t("messageBodyAr")}
      labelEn={t("messageBodyEn")}
      valueAr={draft.messageBody.ar}
      valueEn={draft.messageBody.en}
      onChangeAr={(ar) => onChange({ messageBody: { ...draft.messageBody, ar } })}
      onChangeEn={(en) => onChange({ messageBody: { ...draft.messageBody, en } })}
      disabled={disabled}
    />
  );
}
