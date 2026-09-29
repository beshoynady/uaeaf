"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/layout/mega/nav-icon";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { MAX_LIMIT } from "@/lib/search/client";
import type { SearchGroup, SearchSourceKey, SearchState } from "@/lib/search/client";

/** The glyph already drawn for this concept in the mega panels — reused
 *  rather than redrawn, so a club is the same shape everywhere it appears. */
const TYPE_ICON: Record<SearchSourceKey, string> = {
  articles: "news",
  albums: "photoAlbums",
  videos: "videos",
  clubs: "clubs",
  athletes: "athletes",
  coaches: "coaches",
};

/** `Pages.*` already names every one of these nouns site-wide (navigation,
 *  footer, breadcrumbs); reusing it here keeps "Clubs" one string, not a
 *  second one under `Search` that could quietly drift from it. */
const TYPE_LABEL_KEY: Record<SearchSourceKey, string> = {
  articles: "news",
  albums: "albums",
  videos: "videos",
  clubs: "clubs",
  athletes: "athletes",
  coaches: "coaches",
};

const SearchGlyph = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-6">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M17 17l-4-4" />
  </svg>
);

const ErrorGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-6">
    <path d="M12 8v5M12 16.5v.5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

/** One entry the arrow keys can land on, in render order. */
export interface FlatOption {
  optionId: string;
  href: string;
}

export interface SearchResultsProps {
  listId: string;
  groups: readonly SearchGroup[];
  state: SearchState;
  /** Trimmed. Drives the empty-state copy only — a request for it is
   *  `useSearch`'s job, never this component's. */
  term: string;
  activeId: string | null;
  onActiveChange: (id: string) => void;
  onRequestMore: (type: SearchSourceKey) => void;
  loadingMore: ReadonlySet<SearchSourceKey>;
}

/**
 * The dialog's results pane.
 *
 * Four mutually exclusive states — a below-minimum prompt, loading, error, or
 * the grouped listbox (itself covering the "ready but empty" case) — never
 * two rendered together, and the empty and error copy never share a
 * sentence: one says nothing matched, the other says the search itself could
 * not run.
 */
export const SearchResults = ({
  listId,
  groups,
  state,
  term,
  activeId,
  onActiveChange,
  onRequestMore,
  loadingMore,
}: SearchResultsProps) => {
  const t = useTranslations("Search");
  const tPages = useTranslations("Pages");

  if (state === "idle") {
    return (
      <p className="px-5 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">{t("prompt")}</p>
    );
  }

  if (state === "loading") {
    return (
      <p role="status" className="px-5 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
        {t("loading")}
      </p>
    );
  }

  if (state === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-semantic-error)_12%,transparent)] text-[color:var(--color-semantic-error)]"
        >
          <ErrorGlyph />
        </span>
        <strong className="text-body-lg font-bold">{t("errorTitle")}</strong>
        <p className="max-w-sm text-body-sm text-[color:var(--color-text-muted)]">{t("errorBody")}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-muted)]"
        >
          <SearchGlyph />
        </span>
        <strong className="text-body-lg font-bold">{t("emptyTitle", { query: term })}</strong>
        <p className="max-w-sm text-body-sm text-[color:var(--color-text-muted)]">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <ul id={listId} role="listbox" aria-label={t("resultsLabel")} className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto py-2">
      {groups.map((group) => {
        const headingId = `${listId}-h-${group.type}`;
        const canShowMore = group.items.length < group.total && group.items.length < MAX_LIMIT;
        return (
          <li key={group.type} role="group" aria-labelledby={headingId}>
            <div id={headingId} className="flex items-center gap-2 px-5 pb-1.5 pt-3 text-overline text-[color:var(--color-text-muted)]">
              <NavIcon name={TYPE_ICON[group.type]} className="size-[var(--icon-size-xs)]" />
              {tPages(TYPE_LABEL_KEY[group.type])}
            </div>
            <ul>
              {group.items.map((hit) => {
                const optionId = `${listId}-${hit.id}`;
                const isActive = optionId === activeId;
                return (
                  <li key={hit.id}>
                    <Link
                      id={optionId}
                      href={hit.href}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => onActiveChange(optionId)}
                      className={`mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 ${TRANSITION} ${
                        isActive ? "bg-[color:var(--color-surface-sunken)]" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]"
                      >
                        <NavIcon name={TYPE_ICON[group.type]} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-body-sm font-semibold">{hit.title}</span>
                        {hit.subtitle ? (
                          <span className="truncate text-caption text-[color:var(--color-text-muted)]">{hit.subtitle}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {canShowMore ? (
              <button
                type="button"
                onClick={() => onRequestMore(group.type)}
                disabled={loadingMore.has(group.type)}
                className={`mx-5 my-1 flex h-9 items-center gap-1.5 rounded-sm px-2 text-body-sm font-bold text-[color:var(--color-text-link)] ${TRANSITION} ${FOCUS}`}
              >
                {t("showMore", { type: tPages(TYPE_LABEL_KEY[group.type]) })}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};
