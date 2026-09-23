"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { JSONContent } from "@tiptap/react";
import { LanguageTabs } from "@/components/ui/language-tabs";
import { richTextIsEmpty } from "@/lib/admin/article-editor";
import { findParagraphMismatch } from "./paragraph-mismatch";
import { RichTextEditor } from "./rich-text-editor";

/**
 * One rich-text field, recorded in both languages.
 *
 * ── Tabs, where the short fields have columns ──────────────────────────────
 *
 * The two halves were side by side, for the same reason `BilingualField` puts
 * its two inputs side by side: they are one field written twice. A headline
 * fits beside its translation; an article body does not. Two columns gave
 * each language roughly a phone's width to write prose in and drew the
 * toolbar twice in the space one needs, so long-form text is tabbed and short
 * fields stay paired (owner decision 2026-09-23).
 *
 * Both panels stay mounted — `LanguageTabs` hides rather than unmounts — so
 * the editors keep their history and the mismatch notice below can still see
 * both halves at once.
 *
 * What this adds is the comparison. The two halves are written weeks apart,
 * often by different people, and the failure nobody catches is a translator
 * merging two paragraphs into one — visible only once the published page
 * shows five blocks in Arabic beside four in English.
 *
 * The warning is inline rather than a toast, which is ADR-0016's hierarchy
 * applied literally: this is a standing property of the content, not an event
 * that happened. A toast would announce it once and vanish, leaving the
 * mismatch in place with nothing on screen to say so. It never blocks a save
 * — the two languages may legitimately differ, and the author is the one who
 * knows.
 */
export function BilingualRichText({
  id,
  labelAr,
  labelEn,
  valueAr,
  valueEn,
  onChangeAr,
  onChangeEn,
  disabled,
}: {
  id: string;
  labelAr: string;
  labelEn: string;
  valueAr: JSONContent | null;
  valueEn: JSONContent | null;
  onChangeAr: (value: JSONContent) => void;
  onChangeEn: (value: JSONContent) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("RichText");
  const noticeId = useId();
  const mismatch = findParagraphMismatch(valueAr, valueEn);

  return (
    <div className="flex flex-col gap-3">
      <LanguageTabs
        label={t("languageTabsLabel")}
        tabs={[
          {
            value: "ar",
            label: labelAr,
            complete: !richTextIsEmpty(valueAr),
            statusLabel: richTextIsEmpty(valueAr) ? t("tabEmpty") : t("tabWritten"),
          },
          {
            value: "en",
            label: labelEn,
            complete: !richTextIsEmpty(valueEn),
            statusLabel: richTextIsEmpty(valueEn) ? t("tabEmpty") : t("tabWritten"),
          },
        ]}
        panel={(value) =>
          value === "ar" ? (
            <RichTextEditor
              id={`${id}-ar`}
              label={labelAr}
              lang="ar"
              value={valueAr}
              onChange={onChangeAr}
              disabled={disabled}
              describedBy={mismatch ? noticeId : undefined}
            />
          ) : (
            <RichTextEditor
              id={`${id}-en`}
              label={labelEn}
              lang="en"
              value={valueEn}
              onChange={onChangeEn}
              disabled={disabled}
              describedBy={mismatch ? noticeId : undefined}
            />
          )
        }
      />

      {mismatch ? (
        <p
          id={noticeId}
          role="status"
          className="text-caption text-[color:var(--color-text-secondary)]"
        >
          {t("paragraphMismatch", { ar: mismatch.ar, en: mismatch.en })}
        </p>
      ) : null}
    </div>
  );
}
