import { useTranslations } from "next-intl";
import { StatCard } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import { knownCounts, type SeasonStats } from "@/lib/seasons/season-stats";
import type { AppLocale } from "@/i18n/routing";

/**
 * The season's counts, riding the hero's lower edge.
 *
 * A count the site could not read is left out rather than printed: `null` is
 * "unknown", and a `0` in its place would be a false statement. That is why
 * events never appear here yet — they are always `null` until public events
 * exist — and why the row disappears entirely when the API answered nothing.
 */
export const SeasonStatsRow = ({ stats, locale }: { stats: SeasonStats; locale: AppLocale }) => {
  const t = useTranslations("Seasons.stats");
  const digits = new Intl.NumberFormat(locale, { numberingSystem: "latn" });
  const shown = knownCounts(stats);
  if (shown.length === 0) return null;

  return (
    <section aria-label={t("label")} className={`season-stats ${CONTAINER}`}>
      <ul className="season-stats__grid">
        {shown.map(({ key, value }) => (
          <li key={key}>
            <StatCard value={digits.format(value)} label={t(key)} />
          </li>
        ))}
      </ul>
    </section>
  );
};
