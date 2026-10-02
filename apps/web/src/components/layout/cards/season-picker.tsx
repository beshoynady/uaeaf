"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { SearchField } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { BADGE, RECESS } from "@/components/ui/surface";
import { matchesSeasonQuery } from "@/lib/seasons/year-search";
import type { HeaderSeason } from "@/lib/header/features";

/** How many seasons the picker lists at once: the latest three with no query,
 *  the first three matches with one (header design spec §3.4). */
export const SEASON_PICKER_ROWS = 3;

/**
 * "Go to a season": the Events & Seasons panel's middle track.
 *
 * Every public season arrives with the header's one server read, so the year
 * search is a filter over that list and makes no request. A query is read
 * with Latin digits (`matchesSeasonQuery`), so `٢٠٢٤` finds what `2024` finds.
 *
 * Every season's short name sits in the same neutral tile, on the header's own
 * raised step and strong edge, which hold in both themes: seasons are told
 * apart by name, never by a colour per season (seasons design spec §5.3). The
 * current one carries a "Current" pill in words, so colour is not what marks
 * it either.
 *
 * The rows join the panel's arrow-key roving (`data-nav-focusable`); the
 * search field does not, since Home and End belong to its caret.
 */
export const SeasonPicker = ({ seasons }: { seasons: readonly HeaderSeason[] }) => {
  const t = useTranslations("HeaderCards");
  const headingId = useId();
  const [query, setQuery] = useState("");
  const shown = seasons.filter((season) => matchesSeasonQuery(season.searchText, query)).slice(0, SEASON_PICKER_ROWS);

  return (
    <section aria-labelledby={headingId} className={`flex min-w-0 flex-col gap-3 p-4 ${RECESS}`}>
      <h2 id={headingId} className="text-overline text-[color:var(--color-text-muted)]">
        {t("seasonPickerHeading")}
      </h2>
      <SearchField
        label={t("seasonSearchLabel")}
        labelHidden
        value={query}
        onValueChange={setQuery}
        placeholder={t("seasonSearchPlaceholder")}
        clearLabel={t("seasonSearchClear")}
      />
      <ul aria-live="polite" className="flex flex-col gap-1">
        {shown.map((season) => (
          <li key={season.slug}>
            <Link
              href={`/seasons/${season.slug}`}
              data-nav-focusable=""
              className={`flex min-h-11 items-center gap-3 rounded-sm p-2 ${TRANSITION} ${FOCUS} hover:bg-[color:var(--color-surface-raised)] active:text-[color:var(--color-text-secondary)]`}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] text-caption font-extrabold text-[color:var(--color-text-primary)]"
              >
                <bdi dir="ltr">{season.shortName}</bdi>
              </span>
              <span className="min-w-0 text-body font-bold text-[color:var(--color-text-primary)]">{season.name}</span>
              {season.isCurrent ? (
                <span
                  className={`${BADGE} border-transparent bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]`}
                >
                  {t("seasonCurrent")}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="p-2 text-body-sm text-[color:var(--color-text-muted)]">
            {t("seasonNoMatch", { query: query.trim() })}
          </li>
        ) : null}
      </ul>
    </section>
  );
};
