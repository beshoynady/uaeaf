"use client";

import { useLocale } from "next-intl";
import { SeoFields } from "./seo-fields";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { SeoDraft } from "@/lib/admin/editorial-draft";
import type { AppLocale } from "@/i18n/routing";

/**
 * The SEO tab (ADR-0102 §D1).
 *
 * `SeoFields` unchanged — the same component the five editors already used,
 * moved out of the page's vertical flow and into a tab of its own. That move is
 * the whole change: these fields used to be the last section of a long form,
 * below everything an author was actually writing, and the two most consequence-
 * bearing strings on the page were the two least likely to be read.
 *
 * ── Why this file adds nothing else ───────────────────────────────────────
 *
 * It was written with a search-result preview beside the fields, as the canvas
 * draws. `SeoFields` already ends with one — `Preview`, which truncates at the
 * guidance limits and names which language it is showing. Two previews of one
 * pair of fields is worse than one wherever they disagree, and they would have:
 * mine did not truncate. So this is a measure, not a second component.
 *
 * The one thing the canvas's preview has that the existing one does not is the
 * page's URL above the title. Adding it means a `publicPath` prop on a
 * component five screens share; recorded as a follow-up rather than done here,
 * because it is a change to those five screens and not to this tab.
 *
 * ── The measure ──────────────────────────────────────────────────────────
 *
 * Capped rather than full-bleed. The tab gives these fields the whole content
 * width, and a meta description stretched across 1100px is harder to judge than
 * the ~60-character line it will actually be shown as.
 */
export const SeoPanel = ({
  seo,
  onChange,
  disabled,
  images,
  canReadMedia,
  onUploaded,
}: {
  seo: SeoDraft;
  onChange: (seo: SeoDraft) => void;
  disabled: boolean;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  onUploaded: (image: MediaAssetOption) => void;
}) => {
  const locale = useLocale() as AppLocale;

  return (
    <div className="flex w-full max-w-[72rem] min-w-0 flex-col gap-4">
      <SeoFields
        seo={seo}
        onChange={onChange}
        disabled={disabled}
        images={images}
        canReadMedia={canReadMedia}
        locale={locale}
        onUploaded={onUploaded}
      />
    </div>
  );
};
