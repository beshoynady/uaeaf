"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import type { LocalizedText } from "@/lib/api/types";

/**
 * The heading trio seven of the ten sections share: the small line above, the
 * heading itself, and — where the section has one — the standfirst under it.
 *
 * Extracted because it is the same three fields with the same labels seven
 * times, and seven copies is seven places to fix a label. Each section still
 * owns its own ids, so two sections' fields can never collide.
 */
export const SectionHeadings = <T extends { eyebrow: LocalizedText; title: LocalizedText; description?: LocalizedText }>({
  idPrefix,
  value,
  patch,
  disabled,
  withDescription = false,
}: {
  idPrefix: string;
  value: T;
  patch: (change: Partial<T>) => void;
  disabled: boolean;
  /** Four sections have no standfirst in the approved composition. */
  withDescription?: boolean;
}) => {
  const t = useTranslations("AboutFederation");

  return (
    <>
      <BilingualField
        id={`${idPrefix}-eyebrow`}
        labelAr={t("headings.eyebrow")}
        labelEn={t("headings.eyebrow")}
        valueAr={value.eyebrow.ar}
        valueEn={value.eyebrow.en}
        onChangeAr={(ar) => patch({ eyebrow: { ...value.eyebrow, ar } } as Partial<T>)}
        onChangeEn={(en) => patch({ eyebrow: { ...value.eyebrow, en } } as Partial<T>)}
        disabled={disabled}
        required
      />

      <BilingualField
        id={`${idPrefix}-title`}
        labelAr={t("headings.title")}
        labelEn={t("headings.title")}
        valueAr={value.title.ar}
        valueEn={value.title.en}
        onChangeAr={(ar) => patch({ title: { ...value.title, ar } } as Partial<T>)}
        onChangeEn={(en) => patch({ title: { ...value.title, en } } as Partial<T>)}
        disabled={disabled}
        required
      />

      {withDescription && value.description ? (
        <BilingualField
          id={`${idPrefix}-description`}
          labelAr={t("headings.description")}
          labelEn={t("headings.description")}
          valueAr={value.description.ar}
          valueEn={value.description.en}
          onChangeAr={(ar) =>
            patch({ description: { ...(value.description as LocalizedText), ar } } as Partial<T>)
          }
          onChangeEn={(en) =>
            patch({ description: { ...(value.description as LocalizedText), en } } as Partial<T>)
          }
          disabled={disabled}
          required
          multiline
        />
      ) : null}
    </>
  );
};
