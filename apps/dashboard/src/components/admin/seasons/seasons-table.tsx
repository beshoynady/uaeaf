"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { BUTTON_SECONDARY } from "@/components/ui/interactive";
import { UiIcon } from "@/lib/icons/ui-icons";
import { isContentLinked, seasonNameOf } from "@/lib/admin/seasons/list-filters";
import {
  SeasonContentSummary,
  SeasonName,
  SeasonRange,
  SeasonStatus,
  SeasonTagline,
  SeasonTile,
} from "./season-row-parts";
import type { Column } from "@/components/ui/data-table";
import type { AdminSeason, SeasonContent } from "@/lib/admin/seasons/types";

/**
 * The seasons, as a table from `xl` and as cards below it — the album and
 * video tables' arrangement, for their measured reason: four columns plus the
 * row actions need the width the sidebar leaves only from `xl`.
 *
 * Rows arrive sorted; this draws what it is given.
 */

const UNKNOWN_CONTENT: SeasonContent = { albums: null, videos: null };

export interface SeasonRowActions {
  canUpdate: boolean;
  canDelete: boolean;
  busy: boolean;
  onMakeCurrent: (season: AdminSeason) => void;
  onDelete: (season: AdminSeason) => void;
  /** The id of the line that says why a delete is locked, so a locked
   *  button's reason is announced with it. */
  lockReasonId: string;
}

/**
 * Make current, edit, delete — in that order, the mockup's.
 *
 * "Make current" is absent on the season that already is: pressing it would
 * do nothing, and there is no route that leaves the platform with no current
 * season. Delete is shown disabled, not hidden, when the season still holds
 * content — the refusal the API would give — so the reader sees that deleting
 * is a thing that exists and why it is locked here.
 */
const RowActions = ({
  season,
  content,
  locale,
  actions,
}: {
  season: AdminSeason;
  content: SeasonContent;
  locale: "ar" | "en";
  actions: SeasonRowActions;
}) => {
  const t = useTranslations("Seasons");
  const name = seasonNameOf(season, locale);
  const locked = isContentLinked(content) === true;

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {actions.canUpdate && !season.isCurrent ? (
        <Button variant="secondary" disabled={actions.busy} onClick={() => actions.onMakeCurrent(season)}>
          <span className="inline-flex items-center gap-1.5">
            <UiIcon name="star" className="size-[var(--icon-size-xs)]" />
            {t("makeCurrent")}
          </span>
        </Button>
      ) : null}
      <Link href={`/seasons/${season.id}/edit`} aria-label={t("editNamed", { name })} className={BUTTON_SECONDARY}>
        {t("edit")}
      </Link>
      {actions.canDelete ? (
        <Button
          variant="ghost"
          disabled={actions.busy || locked}
          aria-label={t("deleteNamed", { name })}
          aria-describedby={locked ? actions.lockReasonId : undefined}
          onClick={() => actions.onDelete(season)}
        >
          {t("delete")}
        </Button>
      ) : null}
    </span>
  );
};

export const SeasonsTable = ({
  seasons,
  content,
  locale,
  now,
  actions,
}: {
  seasons: readonly AdminSeason[];
  content: ReadonlyMap<string, SeasonContent>;
  locale: "ar" | "en";
  now: Date;
  actions: SeasonRowActions;
}) => {
  const t = useTranslations("Seasons");
  const contentOf = (season: AdminSeason) => content.get(season.id) ?? UNKNOWN_CONTENT;

  const identity = (season: AdminSeason) => (
    <span className="flex min-w-0 items-center gap-3">
      <SeasonTile season={season} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <SeasonName season={season} locale={locale} />
        <SeasonRange season={season} locale={locale} />
        <SeasonTagline season={season} locale={locale} />
      </span>
    </span>
  );

  const columns: Column<AdminSeason>[] = [
    { key: "season", header: t("colSeason"), render: identity },
    {
      key: "status",
      header: t("colStatus"),
      width: "12rem",
      render: (season) => <SeasonStatus season={season} locale={locale} now={now} />,
    },
    {
      key: "content",
      header: t("colContent"),
      width: "11rem",
      render: (season) => <SeasonContentSummary content={contentOf(season)} />,
    },
    {
      key: "actions",
      header: t("colActions"),
      width: "20rem",
      render: (season) => <RowActions season={season} content={contentOf(season)} locale={locale} actions={actions} />,
    },
  ];

  return (
    <>
      {/* Phone and tablet width: a list, announced as one. */}
      <ul aria-label={t("tableCaption")} className="flex flex-col gap-3 xl:hidden">
        {seasons.map((season) => (
          <li
            key={season.id}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-3"
          >
            {identity(season)}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <SeasonStatus season={season} locale={locale} now={now} />
              <SeasonContentSummary content={contentOf(season)} />
            </div>
            <RowActions season={season} content={contentOf(season)} locale={locale} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="hidden xl:block">
        <DataTable
          caption={t("tableCaption")}
          columns={columns}
          rows={seasons}
          rowKey={(season) => season.id}
          empty={t("noSeasonsTitle")}
        />
      </div>
    </>
  );
};
