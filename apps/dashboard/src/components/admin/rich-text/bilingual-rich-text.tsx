"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { JSONContent } from "@tiptap/react";
import { findParagraphMismatch } from "./paragraph-mismatch";
import { RichTextEditor } from "./rich-text-editor";

/**
 * One rich-text field, recorded in both languages.
 *
 * The two halves sit side by side for the same reason `BilingualField` puts
 * its two inputs side by side: they are one field written twice, filled
 * together and published together.
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
      <div className="grid gap-4 lg:grid-cols-2">
        <RichTextEditor
          id={`${id}-ar`}
          label={labelAr}
          lang="ar"
          value={valueAr}
          onChange={onChangeAr}
          disabled={disabled}
          describedBy={mismatch ? noticeId : undefined}
        />
        <RichTextEditor
          id={`${id}-en`}
          label={labelEn}
          lang="en"
          value={valueEn}
          onChange={onChangeEn}
          disabled={disabled}
          describedBy={mismatch ? noticeId : undefined}
        />
      </div>

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
