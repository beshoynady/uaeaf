import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { BRAND_VISUALLY_HIDDEN } from "@uaeaf/brand-ui";
import { PANEL } from "@/components/ui/surface";
import { formatSeasonDate, formatSeasonRange, isoDay } from "@/lib/seasons/season-days";
import { layoutTimeline } from "@/lib/seasons/timeline";
import { SEASON_PHASE_TYPES, type SeasonKeyDate, type SeasonPhase } from "@/lib/seasons/types";
import type { AppLocale } from "@/i18n/routing";
import { PhaseSwatch } from "./phase-swatch";
import "./seasons.css";

/** Custom properties the stylesheet positions by (`seasons.css`). */
const place = (values: Record<string, number>): CSSProperties =>
  Object.fromEntries(Object.entries(values).map(([name, value]) => [`--season-${name}`, value])) as CSSProperties;

/**
 * The season's phases on one axis, with today and the key dates beneath.
 *
 * One list serves both layouts: below `md` it reads top to bottom, from `md`
 * the same items sit on a grid of the season's days (`lib/seasons/timeline.ts`
 * places them). The month axis and today's line are drawn for sight only; the
 * phases, today and the key dates are all readable as text.
 *
 * Server Component. `now` is passed in, so a render is the same for every
 * reader of one cached page and a test can pin it.
 */
export const SeasonTimeline = ({
  phases,
  keyDates,
  startDate,
  endDate,
  now,
  locale,
}: {
  phases: readonly SeasonPhase[];
  keyDates: readonly SeasonKeyDate[];
  startDate: string;
  endDate: string;
  now: Date;
  locale: AppLocale;
}) => {
  const t = useTranslations("Seasons");
  const layout = layoutTimeline({ startDate, endDate, phases, keyDates }, now, locale);
  const types = SEASON_PHASE_TYPES.filter((type) => layout.phases.some(({ phase }) => phase.type === type));

  return (
    <div className={`season-timeline ${PANEL}`} style={place({ days: layout.days })}>
      {types.length > 0 ? (
        <ul aria-label={t("timeline.legendLabel")} className="season-timeline__legend text-body-sm">
          {types.map((type) => (
            <li key={type} className="flex items-center gap-2">
              <PhaseSwatch type={type} />
              {t(`phaseTypes.${type}`)}
            </li>
          ))}
        </ul>
      ) : null}

      <ol aria-hidden="true" className="season-timeline__months text-caption text-[color:var(--color-text-secondary)]">
        {layout.months.map((month) => (
          <li key={`${month.start}`} className="season-timeline__month" style={place({ from: month.start, to: month.end })}>
            {month.label}
          </li>
        ))}
      </ol>

      <div className="season-timeline__band">
        {layout.phases.length > 0 ? (
          <ol aria-label={t("timeline.phasesLabel")} className="season-timeline__phases">
            {layout.phases.map(({ phase, start, end, lane }) => {
              const range = formatSeasonRange(phase.from, phase.to, locale, "dayMonth");
              const name = phase.name[locale];
              return (
                <li
                  key={`${phase.type}-${start}-${lane}`}
                  data-phase={phase.type}
                  title={`${name} · ${t(`phaseTypes.${phase.type}`)} · ${range}`}
                  className="season-timeline__phase season-phase-tone"
                  style={place({ from: start, to: end, lane })}
                >
                  <span className="season-timeline__phase-name text-body-sm font-bold">{name}</span>
                  <span className="season-timeline__phase-meta text-caption">
                    <span className={BRAND_VISUALLY_HIDDEN}>{t("timeline.phaseType", { type: "" })}</span>
                    {t(`phaseTypes.${phase.type}`)}
                    <span aria-hidden="true"> · </span>
                    <time dateTime={`${isoDay(phase.from)}/${isoDay(phase.to)}`}>{range}</time>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("timeline.empty")}</p>
        )}

        {layout.today === null ? null : (
          <div className="season-timeline__today" style={place({ today: layout.today })}>
            <span className="text-caption font-bold" aria-hidden="true">
              {t("timeline.today")}
            </span>
            <span aria-hidden="true" className="season-timeline__today-line" />
            <span className={BRAND_VISUALLY_HIDDEN}>
              {t("timeline.todayLabel", { date: formatSeasonDate(now, locale) })}
            </span>
          </div>
        )}
      </div>

      {layout.keyDates.length > 0 ? (
        <ol aria-label={t("timeline.keyDatesLabel")} className="season-timeline__keydates">
          {layout.keyDates.map(({ keyDate, column, side }) => (
            <li
              key={`${column}-${keyDate.title.en}`}
              data-side={side}
              className="season-timeline__keydate"
              style={place({ from: column })}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" className="mt-1 size-3 shrink-0 fill-current">
                <path d="M6 0 12 6 6 12 0 6z" />
              </svg>
              <span className="flex min-w-0 flex-col">
                <time dateTime={isoDay(keyDate.date)} className="text-caption font-bold text-[color:var(--color-action-default)]">
                  {formatSeasonDate(keyDate.date, locale, "dayMonth")}
                </time>
                <span className="text-body-sm">{keyDate.title[locale]}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};
