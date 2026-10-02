import { getTranslations } from "next-intl/server";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { OrgChartView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { CommitteeGroup } from "../shared/committee-card";
import { count } from "../shared/text";
import { committeeCount, hasStructure, orderedRows } from "./board-data";
import { ChartRow, Connector } from "./org-chart";

/** A level's caption: what the nodes beneath it are, and how many. */
const LevelCaption = ({ title, meta }: { title: string; meta?: string }) => (
  <p className="flex flex-wrap items-baseline gap-x-[var(--space-2)] text-start md:justify-center md:text-center">
    <span className="text-label font-bold">{title}</span>
    {meta ? <span className="text-label text-[color:var(--surface-text-muted)]">{meta}</span> : null}
  </p>
);

/**
 * The organisational chart, «من الجمعية العمومية إلى اللجان».
 *
 * Read top-down as the federation is governed: the member clubs as the
 * general assembly, the board rank by rank as the admin placed its positions,
 * then the committees split into standing (each with its own sub-committees)
 * and the sub-committees that report to the board directly.
 *
 * The levels are an ordered list because the order is the meaning. A level
 * with nothing in it is left out along with the connector into it, so the
 * chart never draws a line to nothing.
 */
export const BoardStructure = async ({ chart, locale }: { chart: OrgChartView; locale: AppLocale }) => {
  if (!hasStructure(chart)) return null;

  const [t, tGov] = await Promise.all([
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  const rows = orderedRows(chart);
  const committees = committeeCount(chart);
  const levels = [
    chart.memberClubCount > 0 ? "assembly" : null,
    rows.length > 0 ? "board" : null,
    committees > 0 ? "committees" : null,
  ].filter((level): level is "assembly" | "board" | "committees" => level !== null);

  return (
    <Surface kind="canvas" mesh id="structure">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <div className="flex flex-col gap-[var(--space-3)]">
          <span data-part="eyebrow" className="text-label text-[color:var(--surface-link)]">
            {t("structureEyebrow")}
          </span>
          <SectionHeading title={t("structureTitle")} description={t("structureLead")} />
        </div>

        <ol data-field="org-chart" className="flex flex-col">
          {levels.map((level, index) => (
            <li key={level} data-part={`level-${level}`} className="flex flex-col">
              {index > 0 ? <Connector /> : null}

              {level === "assembly" ? (
                <div
                  data-part="assembly"
                  className="gov-pop md:mx-auto md:w-1/2"
                  style={revealStep(0)}
                >
                  <Surface
                    kind="brand-green"
                    as="div"
                    className="flex min-h-[var(--space-12)] flex-col justify-center gap-[var(--space-1)] rounded-[var(--radius-md)] px-[var(--space-5)] py-[var(--space-4)] text-start md:text-center"
                  >
                    <span className="text-h4">{t("generalAssembly")}</span>
                    <span className="text-label">
                      {t("generalAssemblyMeta", { count: count(chart.memberClubCount, locale) })}
                    </span>
                  </Surface>
                </div>
              ) : null}

              {level === "board" ? (
                <div className="flex flex-col gap-[var(--space-4)]">
                  <LevelCaption title={t("boardLevel")} />
                  {rows.map((row, rowIndex) => (
                    <div key={row.rank} className="flex flex-col">
                      {rowIndex > 0 ? <Connector /> : null}
                      <ChartRow row={row} locale={locale} />
                    </div>
                  ))}
                </div>
              ) : null}

              {level === "committees" ? (
                <div data-part="committees" className="flex flex-col gap-[var(--space-10)]">
                  <LevelCaption title={t("committeesLevel")} meta={t("committeesMeta", { count: committees })} />
                  <CommitteeGroup
                    title={tGov("standing")}
                    hint={tGov("standingHint")}
                    level="h3"
                    committees={chart.standing}
                    locale={locale}
                    photoLabel={tGov("photoPending")}
                    viewLabel={tGov("viewCommittee")}
                    subsOfLabel={t("subsOf")}
                  />
                  <CommitteeGroup
                    title={tGov("boardSubs")}
                    level="h3"
                    committees={chart.boardSubCommittees}
                    locale={locale}
                    photoLabel={tGov("photoPending")}
                    viewLabel={tGov("viewCommittee")}
                    subsOfLabel={t("subsOf")}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};
