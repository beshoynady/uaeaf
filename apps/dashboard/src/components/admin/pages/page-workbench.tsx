"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { STATIC_PAGES, type StaticPage } from "@/lib/admin/static-pages";
import { PageEditor, type PageRecord } from "./page-editor";
import type { MediaAssetOption } from "./media-picker";
import type { AppLocale } from "@/i18n/routing";
import { SearchField } from "@/components/ui/search-field";

/** One page's stored row plus what the signed-in user may do with it. */
export interface PageEntry {
  key: string;
  record: PageRecord;
  canEdit: boolean;
}

/**
 * The site's singleton pages, on one screen.
 *
 * A list beside an editor, the same shape as the roles screen, because the
 * task is the same: pick one record out of a dozen and change it. Twelve
 * separate routes would each be a page with one form on it, and the person
 * filling them in would spend the work navigating between them.
 *
 * The list says which pages are still empty, because that is the question
 * this screen is opened with far more often than "what does the news page
 * say" — an empty page renders an empty header on the public site, and
 * nothing else in the platform points that out.
 */
export function PageWorkbench({
  entries,
  images,
  canReadMedia,
  locale,
}: {
  entries: readonly PageEntry[];
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("SitePages");

  // The library is seeded from the server and then grows in place: an image
  // uploaded from a picker has to be selectable straight away, and a reload
  // to see it would throw away every unsaved edit on the page around it.
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);

  const [selectedKey, setSelectedKey] = useState<string | null>(STATIC_PAGES[0]?.key ?? null);
  const [query, setQuery] = useState("");

  const byKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return STATIC_PAGES;
    return STATIC_PAGES.filter(
      (page) =>
        page.key.includes(needle) || t(`page_${page.key}`).toLowerCase().includes(needle),
    );
  }, [query, t]);

  const page = STATIC_PAGES.find((candidate) => candidate.key === selectedKey) ?? null;
  const entry = page ? byKey.get(page.key) : undefined;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section
        aria-label={t("listLabel")}
        className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)]"
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--color-border-default)] px-4 py-3">
          <h2 className="text-title font-bold text-[color:var(--color-text-primary)]">
            {t("listLabel")}
          </h2>
          <span className="rounded-[var(--radius-full)] border border-[color:var(--color-border-default)] px-2 text-caption tabular-nums text-[color:var(--color-text-secondary)]">
            {STATIC_PAGES.length}
          </span>
        </div>

        <div className="px-4 py-3">
          <SearchField
          label={t("searchPages")}
          value={query}
          onValueChange={setQuery}
        />
        </div>

        {visible.length === 0 ? (
          <p className="px-4 pb-4 text-body-sm text-[color:var(--color-text-muted)]">
            {t("noPages")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 px-2 pb-3">
            {visible.map((candidate) => {
              const selected = candidate.key === selectedKey;
              const filled = byKey.get(candidate.key)?.record != null;
              return (
                <li key={candidate.key}>
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => setSelectedKey(candidate.key)}
                    className={`flex w-full flex-col gap-1 rounded-[var(--radius-md)] border px-3 py-2 text-start transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                      selected
                        ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))]"
                        : "border-transparent hover:border-[color:var(--color-border-default)] active:bg-[color:var(--color-surface-skeleton)]"
                    }`}
                  >
                    <span className="text-label font-medium text-[color:var(--color-text-primary)]">
                      {t(`page_${candidate.key}`)}
                    </span>
                    <span className="flex items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
                      {/* A dot with the word beside it: colour alone would
                          fail Chapter 6 §6.2, and these hues do not clear
                          4.5:1 as text anyway. */}
                      <span
                        aria-hidden="true"
                        style={{
                          background: filled
                            ? "var(--color-semantic-success)"
                            : "var(--color-semantic-warning)",
                        }}
                        className="size-2 shrink-0 rounded-[var(--radius-full)]"
                      />
                      {filled ? t("filled") : t("empty")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-label={t("editorLabel")}
        className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)]"
      >
        {page === null ? (
          <p className="px-5 py-16 text-center text-body-sm text-[color:var(--color-text-muted)]">
            {t("noPageSelected")}
          </p>
        ) : (
          <>
            <header className="flex flex-col gap-2 border-b border-[color:var(--color-border-default)] px-5 py-4">
              <h3 className="text-h4 font-bold text-[color:var(--color-text-primary)]">
                {t(`page_${page.key}`)}
              </h3>
              <p dir="ltr" className="text-start font-mono text-caption text-[color:var(--color-text-muted)]">
                {page.apiPath}
              </p>
              {entry?.record == null ? (
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {t("emptyHint")}
                </p>
              ) : null}
            </header>

            <PageEditor
              // Remounts when the selection changes, so the editor's own
              // state starts from the newly selected page rather than
              // carrying the previous one's values across.
              key={page.key}
              page={page}
              record={entry?.record ?? null}
              images={library}
              onUploaded={(image) => setLibrary((current) => [image, ...current])}
              canEdit={entry?.canEdit ?? false}
              canReadMedia={canReadMedia}
              locale={locale}
            />
          </>
        )}
      </section>
    </div>
  );
}

/** Which pages still have no row. Exported for the tiles above the screen. */
export function emptyPageCount(entries: readonly PageEntry[]): number {
  return STATIC_PAGES.filter((page) => entries.find((e) => e.key === page.key)?.record == null)
    .length;
}

export type { StaticPage };
