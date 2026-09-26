"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BUTTON_ICON, FOCUS_RING } from "@/components/ui/interactive";
import { StatusBadge } from "@/components/admin/videos/video-preview-card";
import { UiIcon } from "@/lib/icons/ui-icons";
import { formatShortDate } from "@/lib/admin/videos/dubai-time";
import { affiliationKind } from "@/lib/admin/albums/list-filters";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * One album's facts, drawn once and shown twice — in the table from `xl` and
 * in the card list below it (the video table's arrangement and reasoning).
 * Nothing here decides layout; the two callers own the boxes.
 */

export const titleOf = (title: { ar: string; en: string }, locale: "ar" | "en"): string =>
  title[locale] || title.ar || title.en;

/** 96×64 — a fixed 3:2 box whether or not there is a cover, so no row's
 *  height depends on its data. */
export const CoverThumb = ({ url }: { url?: string | null }) => (
  <span
    aria-hidden="true"
    className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-muted)]"
  >
    {url ? (
      // A plain `<img>`: media-library hosts are not in `images.remotePatterns`,
      // and the optimiser would refuse them (the video still's reasoning).
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" className="size-full object-cover" />
    ) : (
      <UiIcon name="image" className="size-[var(--icon-size-sm)]" />
    )}
  </span>
);

/** The way into the record. `title` carries the full name, because both
 *  layouts clip it. */
export const RowTitle = ({ album, locale }: { album: AdminAlbum; locale: "ar" | "en" }) => {
  const title = titleOf(album.title, locale);
  return (
    <Link
      href={`/albums/${album.id}/edit`}
      title={title}
      className={`line-clamp-2 font-semibold text-[color:var(--color-text-primary)] underline-offset-4 hover:underline ${FOCUS_RING}`}
    >
      {title}
    </Link>
  );
};

/** The address is a technical identifier, so it keeps LTR inside Arabic. */
export const RowSlug = ({ album }: { album: AdminAlbum }) => (
  <span dir="ltr" className="truncate text-caption text-[color:var(--color-text-secondary)]">
    {album.slug}
  </span>
);

/**
 * Where the album sits, in one chip.
 *
 * A championship is named when its name was captured; the other levels have
 * no collection yet, so the chip says which KIND of affiliation it is rather
 * than inventing a name for an id nothing can resolve.
 */
export const AffiliationChip = ({ album, locale }: { album: AdminAlbum; locale: "ar" | "en" }) => {
  const t = useTranslations("Albums");
  const kind = affiliationKind(album);
  const label =
    kind === "championship" && album.championshipName
      ? titleOf(album.championshipName, locale)
      : t(`affiliation_${kind}`);

  return (
    <span
      title={label}
      className={`inline-flex min-h-6 max-w-full items-center truncate rounded-[var(--radius-full)] px-2.5 text-caption font-medium ${
        kind === "none"
          ? "border border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)]"
          : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-primary)]"
      }`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
};

/** Never wrapped: a date broken across two lines reads as two facts. */
export const RowDate = ({ album, locale }: { album: AdminAlbum; locale: "ar" | "en" }) => (
  <span className="whitespace-nowrap">{(album.eventDate && formatShortDate(album.eventDate, locale)) || "—"}</span>
);

/** The published/draft badge the video screens draw. Archived shares the
 *  draft's quiet treatment: both mean "not on the public site", and the label
 *  says which. */
export const RowStatus = ({ album }: { album: AdminAlbum }) => {
  const t = useTranslations("Albums");
  return (
    <StatusBadge
      status={album.publicationState === "Published" ? "published" : "draft"}
      label={t(`state_${album.publicationState}`)}
    />
  );
};

export const RowCount = ({ album }: { album: AdminAlbum }) => {
  const t = useTranslations("Albums");
  return <span className="whitespace-nowrap">{t("photoCount", { count: album.assetCount })}</span>;
};

/**
 * The featured star: one album holds it at a time.
 *
 * A toggle button, `aria-pressed` on the holder. Pressing another album's star
 * moves it — the API clears the previous holder in the same call. Pressing the
 * holder's does nothing, and says so: there is no route that leaves the
 * gallery with no featured album, so offering "unfeature" would be a control
 * whose only outcome is a refusal.
 *
 * Drawn here rather than added to the shared icon set: the set has no star,
 * and one screen's mark is not a reason to grow the system's.
 */
export const FeaturedStar = ({
  album,
  locale,
  canUpdate,
  busy,
  onFeature,
}: {
  album: AdminAlbum;
  locale: "ar" | "en";
  canUpdate: boolean;
  busy: boolean;
  onFeature: (album: AdminAlbum) => void;
}) => {
  const t = useTranslations("Albums");
  const title = titleOf(album.title, locale);
  const published = album.publicationState === "Published";
  // Only a published album can lead the gallery: featuring a draft would
  // clear the album that leads it now and put nothing a visitor can open in
  // its place.
  const label = album.isFeatured
    ? t("featuredHolder", { title })
    : published
      ? t("makeFeatured", { title })
      : t("featureNeedsPublished", { title });

  return (
    <button
      type="button"
      aria-pressed={album.isFeatured}
      aria-label={label}
      title={label}
      disabled={!canUpdate || busy || album.isFeatured || !published}
      onClick={() => onFeature(album)}
      // The holder stays at full ink while disabled: its star is a fact, not
      // an unavailable control, and dimming it would hide the answer to
      // "which album leads the gallery".
      className={`${BUTTON_ICON} aria-[pressed=true]:disabled:text-[color:var(--color-text-primary)]`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[var(--icon-size-sm)]"
        fill={album.isFeatured ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      </svg>
    </button>
  );
};
