import { useId } from "react";
import { useTranslations } from "next-intl";
import { BRAND_FOCUSABLE, BRAND_FOCUS_WIDE, BrandBorder, Surface } from "@uaeaf/brand-ui";
import { LIFT } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { formatSeasonRange, isoDay } from "@/lib/seasons/season-days";
import { knownCounts, type SeasonStats } from "@/lib/seasons/season-stats";
import type { SeasonPhase, SeasonPublic } from "@/lib/seasons/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { SeasonBadges } from "./season-badges";
import { SeasonMark } from "./season-mark";

interface CardProps {
  season: SeasonPublic;
  stats: SeasonStats;
  logo: MediaAssetPublic | undefined;
  locale: AppLocale;
}

/**
 * The known counts as one line — "2 albums · 4 videos". An unknown count is
 * left out, never printed as zero; with none known the line is absent.
 */
const StatsLine = ({ stats, locale }: { stats: SeasonStats; locale: AppLocale }) => {
  const t = useTranslations("Seasons.stats");
  const digits = new Intl.NumberFormat(locale, { numberingSystem: "latn" });
  const known = knownCounts(stats);
  if (known.length === 0) return null;

  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
      {known.map(({ key, value }) => (
        <span key={key}>
          <span className="font-bold">{digits.format(value)}</span> {t(key)}
        </span>
      ))}
    </span>
  );
};

const DateRange = ({ season, locale }: { season: SeasonPublic; locale: AppLocale }) => (
  <time dateTime={`${isoDay(season.startDate)}/${isoDay(season.endDate)}`}>
    {formatSeasonRange(season.startDate, season.endDate, locale)}
  </time>
);

/**
 * The current season at the head of the archive: the hero's ink register at
 * card size, with its badges, dates and counts. The whole card is one link, and
 * its accessible name is the season's name alone.
 */
export const SeasonFeatureCard = ({
  season,
  stats,
  logo,
  runningPhases,
  locale,
}: CardProps & { runningPhases: readonly SeasonPhase[] }) => {
  const titleId = useId();
  const tagline = season.tagline?.[locale]?.trim();

  return (
    <Surface kind="ink" mesh as="article" className={`${LIFT} overflow-hidden rounded-[var(--radius-xl)]`}>
      <Link
        href={`/seasons/${season.slug}`}
        aria-labelledby={titleId}
        className={`flex flex-col-reverse gap-6 rounded-[var(--radius-xl)] p-8 md:flex-row md:items-center md:justify-between md:p-12 ${BRAND_FOCUSABLE} ${BRAND_FOCUS_WIDE}`}
      >
        <span className="flex min-w-0 flex-col gap-4">
          <SeasonBadges isCurrent={season.isCurrent} phases={runningPhases} locale={locale} />
          <h2 id={titleId} className="text-h1 font-extrabold">
            {season.name[locale]}
          </h2>
          {tagline ? <span className="text-body-lg text-[color:var(--surface-text-muted)]">{tagline}</span> : null}
          <span className="text-body-sm text-[color:var(--surface-text-muted)]">
            <DateRange season={season} locale={locale} />
          </span>
          <StatsLine stats={stats} locale={locale} />
        </span>
        <SeasonMark logo={logo} shortName={season.shortName} locale={locale} size="lg" />
      </Link>
    </Surface>
  );
};

/**
 * Any other season, on the same ink header as every other (spec §5.3): seasons
 * are told apart by name and dates, never by a colour per card. The short name
 * sits large and outlined in the header as the design draws it — decoration, so
 * hidden from assistive technology; the name in the body is the real text.
 */
export const SeasonCard = ({ season, stats, logo, locale }: CardProps) => {
  const titleId = useId();

  return (
    <BrandBorder variant="hover" as="article" className={`${LIFT} h-full`}>
      <Link
        href={`/seasons/${season.slug}`}
        aria-labelledby={titleId}
        className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] ${BRAND_FOCUSABLE} ${BRAND_FOCUS_WIDE}`}
      >
        <Surface kind="ink" mesh as="span" className="season-card__header">
          <span aria-hidden="true" className="season-card__numerals text-display-xl font-extrabold">
            <bdi dir="ltr">{season.shortName}</bdi>
          </span>
          <SeasonMark logo={logo} shortName={season.shortName} locale={locale} />
        </Surface>
        <Surface kind="raised" as="span" className="flex flex-1 flex-col gap-3 p-6">
          <h3 id={titleId} className="text-h4 font-bold">
            {season.name[locale]}
          </h3>
          <span className="text-body-sm text-[color:var(--surface-text-muted)]">
            <DateRange season={season} locale={locale} />
          </span>
          <span className="mt-auto border-t border-[color:var(--surface-divider)] pt-3">
            <StatsLine stats={stats} locale={locale} />
          </span>
        </Surface>
      </Link>
    </BrandBorder>
  );
};
