import { useTranslations } from "next-intl";
import { EmptyState } from "@uaeaf/brand-ui";
import { seasonWindow } from "@/lib/seasons/season-days";
import type { SeasonStats } from "@/lib/seasons/season-stats";
import { currentPhases } from "@/lib/seasons/timeline";
import type { SeasonPublic } from "@/lib/seasons/types";
import { seasonSearchText } from "@/lib/seasons/year-search";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { SeasonCard, SeasonFeatureCard } from "./season-card";
import { SeasonsArchiveBrowser, type ArchiveEntry } from "./season-year-search";

/**
 * The archive's body (spec §4.2): the current season as a feature card, then
 * every other season in a three-column grid, newest first, narrowed by year.
 *
 * A season that has not started yet is listed under its own heading rather than
 * among the "previous" ones, which it is not. `null` seasons means the API could
 * not answer and says so; an empty list says nothing is published yet.
 */
export const SeasonsArchive = ({
  seasons,
  stats,
  logos,
  now,
  locale,
}: {
  seasons: readonly SeasonPublic[] | null;
  stats: ReadonlyMap<string, SeasonStats>;
  logos: ReadonlyMap<string, MediaAssetPublic>;
  now: Date;
  locale: AppLocale;
}) => {
  const t = useTranslations("Seasons.archive");

  if (seasons === null) {
    return <EmptyState title={t("unavailableTitle")} description={t("unavailableDescription")} />;
  }
  if (seasons.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const unknown: SeasonStats = { events: null, albums: null, videos: null };
  const entry = (season: SeasonPublic, featured: boolean): ArchiveEntry => {
    const props = {
      season,
      stats: stats.get(season.slug) ?? unknown,
      logo: season.logoId ? logos.get(season.logoId) : undefined,
      locale,
    };
    return {
      key: season.slug,
      searchText: seasonSearchText(season),
      card: featured ? (
        <SeasonFeatureCard {...props} runningPhases={currentPhases(season.phases, now)} />
      ) : (
        <SeasonCard {...props} />
      ),
    };
  };

  const current = seasons.find((season) => season.isCurrent) ?? null;
  const others = seasons.filter((season) => season !== current);
  const hasStarted = (season: SeasonPublic) => seasonWindow(season.startDate, season.endDate).from.getTime() <= now.getTime();

  return (
    <SeasonsArchiveBrowser
      current={current ? entry(current, true) : null}
      upcoming={others.filter((season) => !hasStarted(season)).map((season) => entry(season, false))}
      previous={others.filter(hasStarted).map((season) => entry(season, false))}
      copy={{
        searchLabel: t("searchLabel"),
        searchPlaceholder: t("searchPlaceholder"),
        clearSearch: t("clearSearch"),
        previousHeading: t("previousHeading"),
        upcomingHeading: t("upcomingHeading"),
        // `t.raw` keeps the placeholder; the browser fills it with the query.
        noMatchTitle: t.raw("noMatchTitle") as string,
        noMatchDescription: t("noMatchDescription"),
      }}
    />
  );
};
