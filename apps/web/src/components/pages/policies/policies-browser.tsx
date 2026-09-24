"use client";

import { useMemo, useState } from "react";
import {
  BrandAccentBar,
  Button,
  DocumentCard,
  EmptyState,
  FilterChip,
  SearchField,
  SectionHeading,
  Surface,
} from "@uaeaf/brand-ui";

import type {
  DocumentGroup,
  GovernanceDocument,
  GovernanceDocumentType,
} from "@/lib/pages/governance-documents";
import {
  fold,
  foldDocument,
  formatFileSize,
  formatPublishedAt,
  matchesFolded,
} from "@/lib/pages/governance-documents-search";
import type { AppLocale } from "@/i18n/routing";

/**
 * Every string this component renders, resolved by the server and passed down.
 *
 * `next-intl`'s client hooks would work, but a message bag keeps the component
 * itself free of translation lookups — so the search and filter logic below can
 * be read, and tested, without a locale provider around it.
 */
export type PoliciesCopy = {
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  allFilter: string;
  countUnit: string;
  /**
   * Templates, not functions.
   *
   * A Server Component cannot hand a function to a Client Component — React
   * refuses it outright — so the three messages that take a value travel as
   * their raw strings and are filled in here. `t.raw` on the server is what
   * keeps the placeholders intact.
   */
  showingTemplate: string;
  groups: Record<DocumentGroup, { title: string; description: string }>;
  emptySearchTemplate: string;
  emptyGroupTitle: string;
  emptyDescription: string;
  showAll: string;
  view: string;
  downloadTemplate: string;
  dateLabel: string;
  sizeLabel: string;
  featuredBadge: string;
  seedNotice: string;
  /** The schema's five type names, localised. The badge on a card printed the
   *  raw enum before this existed — "Regulation" in the middle of an Arabic
   *  page, which is the kind of thing that reads as an untranslated string
   *  because it is one. */
  types: Record<GovernanceDocumentType, string>;
};

/** Fills `{name}` placeholders. The same syntax next-intl uses, so a message
 *  reads identically whether it is resolved on the server or here. */
const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

const GROUP_ORDER: readonly DocumentGroup[] = ["regulations", "policies", "forms", "guides"];

/** Green marks a regulation, red a policy — per category, never per item
 *  (ADR-0065 D3, ADR-0098 A9). Forms and guides take the neutral tone. */
const CATEGORY_OF: Record<DocumentGroup, "regulation" | "policy" | "guide"> = {
  regulations: "regulation",
  policies: "policy",
  forms: "guide",
  guides: "guide",
};

export const PoliciesBrowser = ({
  documents,
  locale,
  copy,
}: {
  documents: readonly GovernanceDocument[];
  locale: AppLocale;
  copy: PoliciesCopy;
}) => {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<DocumentGroup | "all">("all");

  /** Both empty states offer the same way out, so they share one. */
  const reset = () => {
    setQuery("");
    setGroup("all");
  };

  /**
   * Each document's searchable text and its rendered labels, computed once.
   *
   * None of this depends on the query, so recomputing it per keystroke was pure
   * waste: the fold alone ran up to sixteen times per character typed, always
   * producing the same strings, and each visible card built two fresh `Intl`
   * formatters. Keyed on the documents and the locale, it runs once.
   */
  const prepared = useMemo(
    () =>
      documents.map((document) => ({
        document,
        haystack: foldDocument(document, locale),
        title: document.title[locale],
        date: formatPublishedAt(document.publishedAt, locale),
        size: formatFileSize(document.fileSize, locale),
      })),
    [documents, locale],
  );

  /**
   * The search result, and the buckets, in one pass.
   *
   * The needle is folded **once** here rather than once per document, and the
   * matches are bucketed by group as they are found — so a chip click reads a
   * length instead of running another filter, and the grid reads a bucket
   * instead of filtering again per group.
   */
  const { matching, buckets } = useMemo(() => {
    const needle = fold(query.trim());
    const found: typeof prepared = [];
    const byGroup: Record<DocumentGroup, typeof prepared> = {
      regulations: [],
      policies: [],
      forms: [],
      guides: [],
    };

    for (const entry of prepared) {
      if (!matchesFolded(entry.haystack, needle)) continue;
      found.push(entry);
      byGroup[entry.document.group].push(entry);
    }

    return { matching: found, buckets: byGroup };
  }, [prepared, query]);

  const shown = group === "all" ? matching : buckets[group];
  const visibleGroups = group === "all" ? GROUP_ORDER : [group];

  return (
    <>
      {/*
        The filter card rides the hero's edge. `canvas` rather than `raised`
        because it is a band, not a plate, and the accent bar above it is the
        identity mark the matrix puts here.
      */}
      <Surface kind="canvas" as="div" className="policies-filters">
        <div className="policies-filters__card">
          <BrandAccentBar />
          <div className="policies-filters__body">
            <SearchField
              label={copy.searchLabel}
              value={query}
              onValueChange={setQuery}
              placeholder={copy.searchPlaceholder}
              clearLabel={copy.clearSearch}
            />

            <div className="policies-filters__chips" role="group" aria-label={copy.searchLabel}>
              <FilterChip
                label={copy.allFilter}
                count={matching.length}
                countLabel={copy.countUnit}
                selected={group === "all"}
                onSelect={() => setGroup("all")}
              />
              {GROUP_ORDER.map((candidate) => (
                <FilterChip
                  key={candidate}
                  label={copy.groups[candidate].title}
                  // The counts follow the *search*, not the group filter: a chip
                  // reading "Policies 7" while the search has narrowed the page
                  // to two is a number that contradicts what the reader sees.
                  count={buckets[candidate].length}
                  countLabel={copy.countUnit}
                  selected={group === candidate}
                  onSelect={() => setGroup(candidate)}
                />
              ))}
            </div>

            {/*
              The running count, announced.

              `aria-live="polite"` rather than `assertive`: a reader typing into
              the search does not want each keystroke interrupting them, and
              `polite` waits for a pause. `aria-atomic` so the whole sentence is
              read rather than only the digit that changed, which on its own
              says nothing.
            */}
            <p className="policies-filters__count" aria-live="polite" aria-atomic="true">
              {fill(copy.showingTemplate, { shown: shown.length, total: documents.length })}
            </p>
          </div>
        </div>
      </Surface>

      <Surface kind="canvas" as="div" className="policies-results">
        <p className="policies-results__notice">{copy.seedNotice}</p>

        {shown.length === 0 ? (
          <EmptyState
            title={
              query.trim() === ""
                ? copy.emptyGroupTitle
                : fill(copy.emptySearchTemplate, { query: query.trim() })
            }
            description={copy.emptyDescription}
            action={
              <Button variant="secondary" onClick={reset}>
                {copy.showAll}
              </Button>
            }
          />
        ) : (
          visibleGroups.map((candidate) => {
            const inGroup = buckets[candidate];

            return (
              <section key={candidate} className="policies-group">
                <SectionHeading
                  title={copy.groups[candidate].title}
                  description={copy.groups[candidate].description}
                />

                {inGroup.length === 0 ? (
                  <EmptyState
                    title={copy.emptyGroupTitle}
                    description={copy.emptyDescription}
                    action={
                      <Button variant="secondary" onClick={reset}>
                        {copy.showAll}
                      </Button>
                    }
                  />
                ) : (
                  <div className="policies-grid">
                    {inGroup.map(({ document, title, date, size }) => (
                      <DocumentCard
                        key={document.id}
                        title={title}
                        description={document.description[locale]}
                        typeLabel={copy.types[document.type]}
                        category={CATEGORY_OF[candidate]}
                        // Absent stays absent: these two are `undefined` for
                        // any record with no date or no file, and the card
                        // renders nothing rather than a dash.
                        date={date}
                        dateLabel={copy.dateLabel}
                        size={size}
                        sizeLabel={copy.sizeLabel}
                        viewHref={document.href}
                        viewLabel={copy.view}
                        downloadHref={document.href}
                        downloadLabel={fill(copy.downloadTemplate, { title })}
                        featured={document.featured}
                        featuredBadge={copy.featuredBadge}
                        borderVariant="hover"
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </Surface>
    </>
  );
};
