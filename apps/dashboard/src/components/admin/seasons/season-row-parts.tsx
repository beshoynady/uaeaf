"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FOCUS_RING } from "@/components/ui/interactive";
import { StatusBadge } from "@/components/admin/videos/video-preview-card";
import { badgeOf, noteOf, seasonNameOf } from "@/lib/admin/seasons/list-filters";
import { formatSeasonRange } from "@/lib/admin/seasons/season-dates";
import type { AdminSeason, SeasonContent } from "@/lib/admin/seasons/types";

/**
 * One season's facts, drawn once and shown twice — in the table from `xl` and
 * in the card list below it (the album and video tables' arrangement). Nothing
 * here decides layout; the two callers own the boxes.
 */

/**
 * The season's short name on a square of its register.
 *
 * The mockup paints each past season a different colour; that is a drawing
 * choice, not a rule (spec §5.3 — no per-season colour without a documented
 * basis). The current season takes the brand green surface and every other
 * season the black one, both the library's own surfaces, so the tile says
 * one thing: which season is current.
 */
export const SeasonTile = ({ season }: { season: AdminSeason }) => (
  <span
    aria-hidden="true"
    data-surface={season.isCurrent ? "brand-green" : "section-black"}
    className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--surface-bg)] text-label font-bold text-[color:var(--surface-text)]"
  >
    <span dir="ltr">{season.shortName}</span>
  </span>
);

/** The way into the record. `title` carries the full name, because both
 *  layouts clip it. */
export const SeasonName = ({ season, locale }: { season: AdminSeason; locale: "ar" | "en" }) => {
  const name = seasonNameOf(season, locale);
  return (
    <Link
      href={`/seasons/${season.id}/edit`}
      title={name}
      className={`line-clamp-2 font-semibold text-[color:var(--color-text-primary)] underline-offset-4 hover:underline ${FOCUS_RING}`}
    >
      {name}
    </Link>
  );
};

/** Never wrapped mid-date: a date broken across two lines reads as two facts. */
export const SeasonRange = ({ season, locale }: { season: AdminSeason; locale: "ar" | "en" }) => (
  <span className="text-caption text-[color:var(--color-text-secondary)]">
    {formatSeasonRange(season.startDate, season.endDate, locale)}
  </span>
);

export const SeasonTagline = ({ season, locale }: { season: AdminSeason; locale: "ar" | "en" }) =>
  season.tagline ? (
    <span className="truncate text-caption text-[color:var(--color-text-muted)]">
      {season.tagline[locale] || season.tagline.ar}
    </span>
  ) : null;

/**
 * The badge and, under it, the one line worth saying about the state.
 *
 * The published/draft badge the album and video screens draw: the current
 * season and a published one take its published treatment, everything off the
 * public site its quiet one, and the label says which.
 */
export const SeasonStatus = ({ season, locale, now }: { season: AdminSeason; locale: "ar" | "en"; now: Date }) => {
  const t = useTranslations("Seasons");
  const badge = badgeOf(season);
  const note = noteOf(season, now);

  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge status={badge === "current" || badge === "published" ? "published" : "draft"} label={t(`badge_${badge}`)} />
      {note ? (
        <span className="text-caption text-[color:var(--color-text-secondary)]">
          {note.kind === "phase"
            ? t("noteCurrentPhase", { phase: note.phase.name[locale] || note.phase.name.ar })
            : t(`note_${note.kind}`)}
        </span>
      ) : null}
    </span>
  );
};

/**
 * What the season still holds — the count the API's delete guard runs.
 *
 * Events are not counted: there is no public-events collection yet (spec
 * §4.1), and a zero would claim knowledge the platform does not have. A count
 * the reader may not see reads "—", never 0.
 */
export const SeasonContentSummary = ({ content }: { content: SeasonContent }) => {
  const t = useTranslations("Seasons");
  const { albums, videos } = content;
  if (albums === 0 && videos === 0) {
    return <span className="text-caption text-[color:var(--color-text-secondary)]">{t("contentNone")}</span>;
  }
  const part = (count: number | null, key: "contentAlbums" | "contentVideos") =>
    count === null ? t(`${key}Unknown`) : t(key, { count });
  return (
    <span className="whitespace-nowrap text-caption text-[color:var(--color-text-secondary)]">
      {part(albums, "contentAlbums")} · {part(videos, "contentVideos")}
    </span>
  );
};
