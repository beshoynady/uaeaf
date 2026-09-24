"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FOCUS_RING } from "@/components/ui/interactive";
import { PlatformMark } from "./platform-mark";
import { StatusBadge } from "./video-preview-card";
import { VideoStill } from "./video-still";
import { formatShortDate } from "@/lib/admin/videos/dubai-time";
import type { AdminVideo } from "@/lib/admin/videos/types";

/**
 * One video's facts, drawn once and shown twice.
 *
 * The table and the phone-width card list are the same rows, the same link and
 * the same options menu in two arrangements. These are the parts they share,
 * so "the status badge" and "the date" have one definition rather than one per
 * layout — the shape a second layout otherwise duplicates and then drifts from.
 *
 * Nothing here decides layout. Each piece sizes itself from the box it is put
 * in, and the two callers own the boxes.
 */

/** 96×54 — the design's 16:9 still, a fixed box whether or not the platform
 *  gave us a picture, so nothing's height depends on its data. The broadcast
 *  banner draws the same box, which is why the size lives here and not in
 *  either caller. */
export const StillBox = ({ url }: { url?: string | null }) => (
  <span aria-hidden="true" className="h-[54px] w-24 shrink-0 overflow-hidden">
    <VideoStill url={url} />
  </span>
);

export const RowStill = ({ row, thumbnails }: { row: AdminVideo; thumbnails?: ReadonlyMap<string, string> }) => (
  <StillBox url={row.thumbnailId ? thumbnails?.get(row.thumbnailId) : undefined} />
);

/**
 * The name to show, in the reader's language.
 *
 * Arabic is the fallback because it is the federation's primary language, and
 * English after it so a record written only in English is not a blank. Spelled
 * once: the row, the menu label and the broadcast banner each had their own
 * version, and the banner's ignored the locale entirely — it showed Arabic in
 * the English dashboard.
 */
export const titleOf = (title: { ar: string; en: string }, locale: "ar" | "en"): string =>
  title[locale] || title.ar || title.en;

/** The way into the record. `title` carries the full name, because both
 *  layouts clip it. */
export const RowTitle = ({ row, locale }: { row: AdminVideo; locale: "ar" | "en" }) => {
  const title = titleOf(row.title, locale);

  return (
    <Link
      href={`/videos/${row.id}/edit`}
      title={title}
      className={`line-clamp-2 font-semibold text-[color:var(--color-text-primary)] underline-offset-4 hover:underline ${FOCUS_RING}`}
    >
      {title}
    </Link>
  );
};

/** The link is a technical identifier, so it keeps LTR inside an Arabic page. */
export const RowUrl = ({ row }: { row: AdminVideo }) => (
  <span dir="ltr" className="truncate text-caption text-[color:var(--color-text-secondary)]">
    {row.url}
  </span>
);

export const RowStatus = ({ row }: { row: AdminVideo }) => {
  const t = useTranslations("Videos");
  return <StatusBadge status={row.status} label={t(`status_${row.status}`)} />;
};

/** Never wrapped: "14 Mar 2026" broken across two lines reads as two facts. */
export const RowDate = ({ row, locale }: { row: AdminVideo; locale: "ar" | "en" }) => (
  <span className="whitespace-nowrap">
    {(row.publishedAt && formatShortDate(row.publishedAt, locale)) || "—"}
  </span>
);

export const RowPlatform = ({ row }: { row: AdminVideo }) => (
  <PlatformMark platform={row.platform} className="whitespace-nowrap" />
);
