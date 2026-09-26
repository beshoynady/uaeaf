"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BRAND_FOCUSABLE,
  BRAND_VISUALLY_HIDDEN,
  BrandBorder,
  Button,
  FilterChip,
  SearchField,
  Surface,
} from "@uaeaf/brand-ui";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import type { TimeRange } from "@uaeaf/content/time-range";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { PublishDate } from "@/components/pages/news/publish-date";
import {
  ALBUM_PERIODS,
  activeAlbumFilters,
  albumsHref,
  hasActiveAlbumFilter,
  nextAlbumQuery,
  withoutAlbumFilter,
} from "@/lib/albums/album-query";
import type { ActiveAlbumFilter, AlbumPeriod, AlbumQuery } from "@/lib/albums/album-query";
import { albumFilterOptions } from "@/lib/albums/facet-options";
import type { FacetOption } from "@/lib/albums/facet-options";
import type { AlbumFilterBarProps } from "./types";
import "./albums.css";

/**
 * The album archive's filters, its result count, and the filters in effect.
 *
 * -- A control exists only when it can narrow something --------------------
 *
 * Each entity filter is drawn from the API's facets, and a facet that is empty
 * removes its control and its label from the DOM. Not disabled, not "all"
 * alone: removed. A select whose only option is "all seasons" is a dead
 * control a keyboard reader still has to tab through, and one listing values
 * no album carries would let a reader ask for a list that cannot exist.
 * `album-filter-bar.spec.tsx` holds this line.
 *
 * The season is live: its facet is grouped from album dates, and each option
 * is the season's own label (`2025–2026`), which is also the value the address
 * and the API carry. Championship, competition and event have no entity to
 * name them yet, so their controls stay out of the page; the day those modules
 * ship, the controls appear with no change here.
 *
 * -- The address is the state ------------------------------------------------
 *
 * A select applies the moment it changes, because each is one complete
 * decision; the search applies on Enter, because a half-typed word is not.
 * Every change goes through `nextAlbumQuery`, so it returns to page 1 and a new
 * championship drops the old one's competition in one place rather than at
 * each control.
 *
 * -- Pinned on desktop -------------------------------------------------------
 *
 * From `lg` the bar is `position: sticky` (`albums.css`). A sticky element
 * sticks inside its parent, so the page must render the bar as a sibling of
 * the grid it filters, not inside a wrapper of its own. While it is pinned it
 * publishes its height, and the root's scroll padding keeps a focused card
 * from scrolling underneath it (WCAG 2.4.11).
 *
 * -- Why a native select -------------------------------------------------------
 *
 * The kit publishes no select, and a native `<select>` is the right control
 * for a one-of-many filter on a touch screen: the platform's own picker, its
 * own keyboard model, its own announcement. It sits on the same neutral plate
 * and tricolour edge the kit's `SearchField` draws, so the row reads as one
 * kind of control. DESIGN SYSTEM GAP, recorded: the kit has no select.
 */

/** The `<option>` value for one occasion. One select carries two entities,
 *  so the value names which one. */
const occasionValue = (query: AlbumQuery): string =>
  query.championship ? `championship:${query.championship}` : query.event ? `event:${query.event}` : "";

const occasionChange = (value: string): Partial<AlbumQuery> => {
  const [kind, id] = value.split(":");
  if (kind === "championship" && id) return { championship: id, event: undefined };
  if (kind === "event" && id) return { event: id, championship: undefined };
  return { championship: undefined, event: undefined };
};

/** Which option list names each entity filter, for the chips. The season is
 *  not here: its value is its label, so it names itself. */
const FACET_OF = {
  championship: "championships",
  competition: "competitions",
  event: "publicEvents",
  athlete: "athletes",
  club: "clubs",
} as const;

/** The field label each entity filter's chip leads with. */
const LABEL_OF = {
  season: "season",
  championship: "occasion",
  competition: "competition",
  event: "occasion",
  athlete: "athlete",
  club: "club",
} as const;

export const AlbumFilterBar = ({
  query,
  facets,
  names,
  total,
  shown,
  onQueryChange,
  className,
}: AlbumFilterBarProps) => {
  const t = useTranslations("albums.filters");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const chips = useRef<HTMLUListElement>(null);
  const refocus = useRef(false);
  const ids = {
    season: useId(),
    occasion: useId(),
    competition: useId(),
    athlete: useId(),
    club: useId(),
    period: useId(),
    from: useId(),
    to: useId(),
  };

  const options = useMemo(() => albumFilterOptions(facets, names, locale), [facets, names, locale]);

  // Drafts for the two inputs that are not applied on every change: the
  // search until Enter, and a date range until it is a possible one.
  const [search, setSearch] = useState(query.q ?? "");
  const [range, setRange] = useState<TimeRange>(query.range);
  // When the address changes under the drafts — Back, or a chip removed —
  // they take the address's values, adjusted during render rather than in an
  // effect so the stale draft is never painted.
  const [seen, setSeen] = useState({ q: query.q, from: query.range.from, to: query.range.to });
  if (seen.q !== query.q || seen.from !== query.range.from || seen.to !== query.range.to) {
    setSeen({ q: query.q, from: query.range.from, to: query.range.to });
    setSearch(query.q ?? "");
    setRange({ from: query.range.from, to: query.range.to });
  }

  const apply = (change: Partial<AlbumQuery>) => {
    const next = nextAlbumQuery(query, change);
    if (onQueryChange) onQueryChange(next);
    else router.push(albumsHref(pathname, next), { scroll: false });
  };

  /*
   * A removed chip, or the clear button, takes itself out of the page with
   * focus on it. Focus then belongs somewhere a reader can continue from — the
   * remaining chips, or the bar — rather than falling back to the top of the
   * document. Done once the new query has arrived, because until then the
   * control is still there.
   */
  const applyAndKeepFocus = (next: AlbumQuery) => {
    refocus.current = true;
    if (onQueryChange) onQueryChange(next);
    else router.push(albumsHref(pathname, next), { scroll: false });
  };

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    (chips.current ?? form.current)?.focus();
  }, [query]);

  // Published while mounted so the root's scroll padding can clear the bar.
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const style = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      style.setProperty("--album-filter-bar-block", `${Math.ceil(entry.contentRect.height)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      style.removeProperty("--album-filter-bar-block");
    };
  }, []);

  const occasions = options.championships.length + options.publicEvents.length > 0;
  const competitions = Boolean(query.championship) && options.competitions.length > 0;
  const hidesSome =
    options.seasons.length === 0 ||
    !occasions ||
    options.athletes.length === 0 ||
    options.clubs.length === 0;
  const rangeIsUsable = rangeIsPossible(range.from, range.to);
  const active = activeAlbumFilters(query);

  const setBound = (bound: "from" | "to", value: string) => {
    const next = { ...range, [bound]: value || undefined };
    setRange(next);
    // An impossible range is held in the draft and explained, never written
    // to the address, where `readAlbumQuery` would silently drop it.
    if (rangeIsPossible(next.from, next.to)) apply({ period: "custom", range: next });
  };

  const chipText = (filter: ActiveAlbumFilter): ReactNode => {
    if (filter.key === "q") return t("searchChip", { text: filter.text });
    if (filter.key === "period") {
      if (filter.period !== "custom") return t(`period_${filter.period}`);
      // Dates go through `PublishDate`, the site's one date formatter, so a
      // chip reads the same numerals and month names as every other date.
      const { from, to } = filter.range;
      const start = from ? <PublishDate date={from} /> : null;
      const end = to ? <PublishDate date={to} /> : null;
      if (start && end) return t.rich("rangeChip", { from: () => start, to: () => end });
      if (start) return t.rich("rangeFromChip", { from: () => start });
      if (end) return t.rich("rangeToChip", { to: () => end });
      return t("period_custom");
    }
    // A season reads as its label even when the facets no longer list it (a
    // shared link to a season whose albums were since unpublished).
    const name =
      filter.key === "season"
        ? filter.id
        : options[FACET_OF[filter.key]].find((option) => option.id === filter.id)?.label;
    // An id the facets cannot name still gets a chip — it is narrowing the
    // list, so the reader has to be able to see it and remove it.
    return name ? `${t(LABEL_OF[filter.key])}: ${name}` : t(LABEL_OF[filter.key]);
  };

  return (
    <div
      ref={root}
      className={["album-filter-bar", className].filter(Boolean).join(" ")}
    >
      <BrandBorder tone="green">
        <Surface kind="ink" mesh as="div" className="album-filter-bar__panel">
          <form
            ref={form}
            tabIndex={-1}
            role="search"
            aria-label={t("label")}
            className="album-filter-bar__fields"
            onSubmit={(event) => {
              event.preventDefault();
              const q = search.trim() || undefined;
              if (q !== query.q) apply({ q });
            }}
          >
            {options.seasons.length > 0 ? (
              <FilterSelect
                id={ids.season}
                label={t("season")}
                value={query.season ?? ""}
                onChange={(value) => apply({ season: value || undefined })}
              >
                <option value="">{t("seasonAll")}</option>
                <Options list={options.seasons} />
              </FilterSelect>
            ) : null}

            {occasions ? (
              <FilterSelect
                id={ids.occasion}
                label={t("occasion")}
                value={occasionValue(query)}
                onChange={(value) => apply(occasionChange(value))}
              >
                <option value="">{t("occasionAll")}</option>
                {options.championships.length > 0 ? (
                  <optgroup label={t("occasionChampionships")}>
                    <Options list={options.championships} prefix="championship:" />
                  </optgroup>
                ) : null}
                {options.publicEvents.length > 0 ? (
                  <optgroup label={t("occasionEvents")}>
                    <Options list={options.publicEvents} prefix="event:" />
                  </optgroup>
                ) : null}
              </FilterSelect>
            ) : null}

            {competitions ? (
              <FilterSelect
                id={ids.competition}
                label={t("competition")}
                value={query.competition ?? ""}
                onChange={(value) => apply({ competition: value || undefined })}
              >
                <option value="">{t("competitionAll")}</option>
                <Options list={options.competitions} />
              </FilterSelect>
            ) : null}

            {options.athletes.length > 0 ? (
              <FilterSelect
                id={ids.athlete}
                label={t("athlete")}
                value={query.athlete ?? ""}
                onChange={(value) => apply({ athlete: value || undefined })}
              >
                <option value="">{t("athleteAll")}</option>
                <Options list={options.athletes} />
              </FilterSelect>
            ) : null}

            {options.clubs.length > 0 ? (
              <FilterSelect
                id={ids.club}
                label={t("club")}
                value={query.club ?? ""}
                onChange={(value) => apply({ club: value || undefined })}
              >
                <option value="">{t("clubAll")}</option>
                <Options list={options.clubs} />
              </FilterSelect>
            ) : null}

            <FilterSelect
              id={ids.period}
              label={t("period")}
              value={query.period}
              onChange={(value) => {
                const period = value as AlbumPeriod;
                apply(period === "custom" ? { period, range } : { period, range: {} });
              }}
            >
              {ALBUM_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {t(`period_${period}`)}
                </option>
              ))}
            </FilterSelect>

            {/* The two dates exist only while "custom" is chosen: a pair of
                empty date inputs under every other period is two controls
                that do nothing. */}
            {query.period === "custom" ? (
              <>
                <DateField id={ids.from} label={t("from")} value={range.from} onChange={(value) => setBound("from", value)} />
                <DateField id={ids.to} label={t("to")} value={range.to} onChange={(value) => setBound("to", value)} />
                {rangeIsUsable ? null : (
                  <p role="status" className="album-filter-bar__range-error text-caption">
                    {t("rangeBackwards")}
                  </p>
                )}
              </>
            ) : null}

            <div className="album-filter-bar__field" data-wide="">
              <SearchField
                label={t("search")}
                value={search}
                placeholder={t("searchPlaceholder")}
                clearLabel={t("searchClear")}
                onValueChange={(value) => {
                  setSearch(value);
                  // Clearing is a complete decision, so it applies at once.
                  if (value === "" && query.q) apply({ q: undefined });
                }}
              />
            </div>

            {hasActiveAlbumFilter(query) ? (
              <div className="album-filter-bar__clear">
                <Button
                  variant="ghost"
                  onClick={() =>
                    applyAndKeepFocus(nextAlbumQuery(query, CLEARED))
                  }
                >
                  {t("clear")}
                </Button>
              </div>
            ) : null}
          </form>

          <div className="album-filter-bar__footer text-caption">
            {hidesSome ? <p className="album-filter-bar__hint">{t("hiddenHint")}</p> : null}
            <p className="album-filter-bar__count" aria-live="polite" aria-atomic="true">
              {t("count", { shown, total })}
            </p>
          </div>
        </Surface>
      </BrandBorder>

      {active.length > 0 ? (
        <ul
          ref={chips}
          tabIndex={-1}
          className="album-filter-bar__active"
          aria-label={t("activeLabel")}
        >
          {active.map((filter) => (
            <li key={filter.key}>
              <FilterChip
                selected
                onSelect={() => applyAndKeepFocus(withoutAlbumFilter(query, filter.key))}
                label={
                  <>
                    <span className={BRAND_VISUALLY_HIDDEN}>{t("remove")}: </span>
                    {chipText(filter)}
                    <span className="album-filter-bar__remove-glyph" aria-hidden="true">
                      {" "}&times;
                    </span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** Every narrowing off; `nextAlbumQuery` returns it to page 1. */
const CLEARED: Partial<AlbumQuery> = {
  season: undefined,
  championship: undefined,
  competition: undefined,
  event: undefined,
  athlete: undefined,
  club: undefined,
  period: "any",
  range: {},
  q: undefined,
};

const Options = ({ list, prefix = "" }: { list: readonly FacetOption[]; prefix?: string }) =>
  list.map((option) => (
    <option key={option.id} value={`${prefix}${option.id}`}>
      {option.label}
    </option>
  ));

/** A label above a native select on the field plate. */
const FilterSelect = ({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <div className="album-filter-bar__field">
    <label htmlFor={id} className="album-filter-bar__label">
      {label}
    </label>
    <div className="album-filter-bar__control brand-ring" data-surface="raised">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`album-filter-bar__input ${BRAND_FOCUSABLE}`}
      >
        {children}
      </select>
    </div>
  </div>
);

/** A label above a date input, on the same plate as the selects. */
const DateField = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) => (
  <div className="album-filter-bar__field">
    <label htmlFor={id} className="album-filter-bar__label">
      {label}
    </label>
    <div className="album-filter-bar__control brand-ring" data-surface="raised">
      <input
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={`album-filter-bar__input ${BRAND_FOCUSABLE}`}
      />
    </div>
  </div>
);
