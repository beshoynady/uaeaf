"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useFocusTrap } from "@/components/layout/use-focus-trap";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { SearchResults, type FlatOption } from "./search-results";
import { useSearch } from "@/lib/search/client";
import type { SearchSourceKey } from "@/lib/search/client";

/** `Pages.*` already names every one of these nouns site-wide; the tab strip
 *  reads the same namespace `SearchResults` uses for its group headings, so
 *  "Clubs" is one string rather than two that could drift apart. */
const TAB_LABEL_KEYS: Record<SearchSourceKey, string> = {
  articles: "news",
  albums: "albums",
  videos: "videos",
  clubs: "clubs",
  athletes: "athletes",
  coaches: "coaches",
};

const SearchIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="size-[var(--icon-size-sm)] shrink-0">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M17 17l-4-4" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-3.5">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

const TabButton = ({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-body-sm font-semibold ${TRANSITION} ${FOCUS} ${
      active
        ? "border-[color:var(--color-brand-black)] bg-[color:var(--color-brand-black)] text-[color:var(--color-text-on-brand)]"
        : "border-[color:var(--color-border-default)] text-[color:var(--color-text-primary)]"
    }`}
  >
    {label}
    <span className="text-caption opacity-70">{count}</span>
  </button>
);

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The site's one search surface — a `dialog` holding a combobox, not a
 * results page (there is none): typing filters a grouped listbox in place,
 * the arrow keys move `aria-activedescendant` without moving real focus off
 * the field, and Escape closes from anywhere inside.
 *
 * A plain `role="dialog"` element rather than a native `<dialog>` — the same
 * choice `VideoPlayerModal` made, and for the same reason
 * (`reference_dialog_search_escape`): the field's own `type="text"` (never
 * `type="search"`) is what actually stops Chromium clearing it on the first
 * Escape, so nothing here depends on the native element's own behaviour, and
 * a plain element keeps every overlay's keyboard handling the same shape.
 *
 * The dialog stays mounted across opens — `HeaderShell` toggles `open`, never
 * the element itself — so `term` and `tab` are exactly what they were the
 * last time the reader closed it, on the same page, with no extra code.
 */
export const SearchDialog = ({ open, onClose }: SearchDialogProps) => {
  const t = useTranslations("Search");
  const tPages = useTranslations("Pages");
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, open);

  const [term, setTerm] = useState("");
  const [tab, setTab] = useState<SearchSourceKey | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const listId = useId();
  const titleId = useId();

  const { groups, state, requestMore, loadingMore } = useSearch(term, locale);

  // A tab the current results no longer carry — the reader typed something
  // new — falls back to "all" rather than showing a single-type list for a
  // type that is not even offered as a tab anymore.
  useEffect(() => {
    if (tab !== "all" && !groups.some((group) => group.type === tab)) setTab("all");
  }, [groups, tab]);

  const visibleGroups = useMemo(
    () => (tab === "all" ? groups : groups.filter((group) => group.type === tab)),
    [groups, tab],
  );

  // The flattened set the arrow keys walk, in the same order the list below
  // renders it — across every visible group, not just one.
  const flatOptions = useMemo<FlatOption[]>(
    () =>
      visibleGroups.flatMap((group) =>
        group.items.map((item) => ({ optionId: `${listId}-${item.id}`, href: item.href })),
      ),
    [visibleGroups, listId],
  );

  useEffect(() => {
    // A results set that no longer contains the active option — a new term, a
    // new tab — must not leave `aria-activedescendant` pointing at an id
    // gone from the DOM.
    if (activeId && !flatOptions.some((option) => option.optionId === activeId)) setActiveId(null);
  }, [flatOptions, activeId]);

  useEffect(() => {
    if (!open) return;
    setActiveId(null);
    // No extra frame: the input is already part of the same commit that made
    // `open` true, so `inputRef.current` is already the mounted element by
    // the time this effect runs.
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Restored to the prior value, not blanked — the drawer's own lock
    // (`HeaderShell`) follows the same rule, so whichever of the two closes
    // first never wipes out a lock the other still holds.
    const previousOverflow = document.body.style.overflow;
    const previousGutter = document.documentElement.style.scrollbarGutter;
    document.body.style.overflow = "hidden";
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
    };
  }, [open]);

  const moveActive = (step: 1 | -1) => {
    if (flatOptions.length === 0) return;
    const currentIndex = flatOptions.findIndex((option) => option.optionId === activeId);
    const nextIndex =
      currentIndex === -1
        ? step === 1
          ? 0
          : flatOptions.length - 1
        : (currentIndex + step + flatOptions.length) % flatOptions.length;
    setActiveId(flatOptions[nextIndex]!.optionId);
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === "Enter") {
      const active = flatOptions.find((option) => option.optionId === activeId);
      if (!active) return;
      event.preventDefault();
      router.push(active.href);
      onClose();
    }
  };

  if (!open) return null;

  const totalCount = groups.reduce((sum, group) => sum + group.total, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[color-mix(in_srgb,var(--color-surface-overlay)_55%,transparent)] px-4 pt-24 sm:pt-32"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKeyDown}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-[color:var(--color-surface-raised)] shadow-modal"
      >
        <h2 id={titleId} className="sr-only">
          {t("dialogLabel")}
        </h2>

        <div className="flex items-center gap-3 border-b border-[color:var(--color-border-default)] px-5">
          <span className="text-[color:var(--color-text-link)]">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            aria-expanded={flatOptions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId ?? undefined}
            aria-label={t("inputLabel")}
            placeholder={t("placeholder")}
            autoComplete="off"
            className="h-14 flex-1 bg-transparent text-body-lg outline-none placeholder:text-[color:var(--color-text-muted)]"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label={t("clear")}
              className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-muted)] ${TRANSITION} ${FOCUS}`}
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>

        {groups.length > 0 ? (
          <div role="tablist" aria-label={t("filterLabel")} className="flex gap-2 overflow-x-auto border-b border-[color:var(--color-border-default)] px-5 py-3">
            <TabButton active={tab === "all"} onClick={() => setTab("all")} label={t("allTab")} count={totalCount} />
            {groups.map((group) => (
              <TabButton
                key={group.type}
                active={tab === group.type}
                onClick={() => setTab(group.type)}
                label={tPages(TAB_LABEL_KEYS[group.type])}
                count={group.total}
              />
            ))}
          </div>
        ) : null}

        <SearchResults
          listId={listId}
          groups={visibleGroups}
          state={state}
          term={term.trim()}
          activeId={activeId}
          onActiveChange={setActiveId}
          onRequestMore={requestMore}
          loadingMore={loadingMore}
        />
      </div>
    </div>
  );
};
