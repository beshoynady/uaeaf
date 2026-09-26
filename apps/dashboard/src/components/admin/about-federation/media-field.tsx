"use client";

import { useTranslations } from "next-intl";
import { FOCUS_RING } from "@/components/ui/interactive";
import Link from "next/link";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { localized } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One picture slot on the About page: the picker, plus the alternative text
 * that belongs to whatever is chosen.
 *
 * ── Where the alternative text lives ──────────────────────────────────────
 *
 * On the asset's own record, not on this placement (owner rule: every picture
 * on a content page is content with a record field). One description of a
 * photograph, written once, correct everywhere it appears — rather than six
 * copies that start identical and drift.
 *
 * `MediaPicker` already requires it in both languages before an upload can
 * finish, so every picture reaching this page has one. What the picker does
 * not offer is editing it afterwards, and adding that would mean changing a
 * component three other screens depend on. So the text is shown here, with a
 * link to the library for changing it. Reported as a deliberate gap rather
 * than quietly widening a shared component's job.
 *
 * ── An empty slot is not an error ─────────────────────────────────────────
 *
 * The page draws an identity-coloured surface where a picture is missing, so
 * nothing is broken by leaving one empty — it is a warning in the
 * pre-submission panel, never a block. The note here says so, because an
 * editor looking at an empty frame has no other way to know it was designed.
 */
export const MediaField = ({
  id,
  label,
  value,
  images,
  canReadMedia,
  disabled,
  locale,
  onChange,
  onUploaded,
  minSourcePx,
}: {
  id: string;
  label: string;
  value: string | null;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  disabled: boolean;
  locale: AppLocale;
  onChange: (id: string | null) => void;
  onUploaded: (image: MediaAssetOption) => void;
  minSourcePx?: number;
}) => {
  const t = useTranslations("AboutFederation");
  const chosen = value ? images.find((image) => image.id === value) : undefined;
  const alt = chosen?.altText ? localized(chosen.altText, locale) : "";

  return (
    <div className="flex flex-col gap-2" id={id}>
      <MediaPicker
        label={label}
        value={value ?? ""}
        images={images}
        canRead={canReadMedia}
        disabled={disabled}
        locale={locale}
        minSourcePx={minSourcePx}
        onChange={(next) => onChange(next === "" ? null : next)}
        onUploaded={onUploaded}
      />

      {chosen ? (
        <p className="text-caption leading-relaxed text-[color:var(--color-text-muted)]">
          {alt ? t("media.altIs", { alt }) : t("media.altMissing")}{" "}
          <Link href={`/${locale}/media`} className="underline">
            {t("media.editInLibrary")}
          </Link>
        </p>
      ) : (
        <p className="text-caption leading-relaxed text-[color:var(--color-text-muted)]">{t("media.emptyIsFine")}</p>
      )}

      {value ? (
        <div>
          <button
            type="button"
            className={`rounded-[var(--radius-xs)] text-label font-semibold text-[color:var(--color-semantic-error-text)] underline disabled:opacity-50 ${FOCUS_RING}`}
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            {t("media.remove")}
          </button>
        </div>
      ) : null}
    </div>
  );
};
