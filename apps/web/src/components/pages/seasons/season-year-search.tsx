"use client";

import { useState, type ReactNode } from "react";
import { Button, EmptyState, SearchField, SectionHeading } from "@uaeaf/brand-ui";
import { matchesSeasonQuery } from "@/lib/seasons/year-search";

/** One season as the archive lists it: its card, already drawn on the server,
 *  and the text a year query is matched against. */
export interface ArchiveEntry {
  key: string;
  searchText: string;
  card: ReactNode;
}

export interface ArchiveCopy {
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  previousHeading: string;
  upcomingHeading: string;
  /** With `{query}` still in it: filled here, since a function cannot cross to the client. */
  noMatchTitle: string;
  noMatchDescription: string;
}

/**
 * The archive, narrowed by year as the reader types.
 *
 * Every card is rendered on the server and handed in; this only decides which
 * are shown. The query is read with Latin digits (`toLatinDigits`), so `٢٠٢٦`
 * finds what `2026` finds. The search is a client filter over the page's own
 * list — every public season is already on it — so it needs no request.
 */
export const SeasonsArchiveBrowser = ({
  current,
  upcoming,
  previous,
  copy,
}: {
  current: ArchiveEntry | null;
  upcoming: readonly ArchiveEntry[];
  previous: readonly ArchiveEntry[];
  copy: ArchiveCopy;
}) => {
  const [query, setQuery] = useState("");
  const keep = (entry: ArchiveEntry) => matchesSeasonQuery(entry.searchText, query);

  const shownCurrent = current && keep(current) ? current : null;
  const shownUpcoming = upcoming.filter(keep);
  const shownPrevious = previous.filter(keep);
  const nothing = !shownCurrent && shownUpcoming.length === 0 && shownPrevious.length === 0;

  return (
    <div className="flex flex-col gap-12">
      <div className="grid md:grid-cols-2">
        <SearchField
          label={copy.searchLabel}
          value={query}
          onValueChange={setQuery}
          placeholder={copy.searchPlaceholder}
          clearLabel={copy.clearSearch}
        />
      </div>

      {/* In the page before any search, and empty until nothing matches: a live
          region inserted together with its message is not reliably read. */}
      <div role="status" className="empty:hidden">
        {nothing ? (
          <EmptyState
            title={copy.noMatchTitle.replace("{query}", query.trim())}
            description={copy.noMatchDescription}
            action={
              <Button variant="secondary" onClick={() => setQuery("")}>
                {copy.clearSearch}
              </Button>
            }
          />
        ) : null}
      </div>

      {shownCurrent ? shownCurrent.card : null}

      <Group title={copy.upcomingHeading} entries={shownUpcoming} />
      <Group title={copy.previousHeading} entries={shownPrevious} />
    </div>
  );
};

const Group = ({ title, entries }: { title: string; entries: readonly ArchiveEntry[] }) =>
  entries.length === 0 ? null : (
    <section className="flex flex-col gap-6" aria-label={title}>
      <SectionHeading title={title} />
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.key}>{entry.card}</li>
        ))}
      </ul>
    </section>
  );
